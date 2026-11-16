import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/nestjs';

const REQUEST_ID_PATTERN = /^[\w.-]{1,128}$/;

function firstLine(value: unknown): string {
  return (
    String(value ?? '')
      .split('\n')
      .find((line) => line.trim().length > 0) ?? ''
  );
}

const DB_UNAVAILABLE_PRISMA_CODES = new Set([
  'P1000', // authentication failed
  'P1001', // can't reach database server
  'P1002', // database server timeout
  'P1003', // database does not exist
  'P1008', // operation timed out
  'P1010', // access denied
  'P1017', // server closed the connection
  'P2024', // connection pool timeout
  'P2037', // too many connections
]);

const DB_UNAVAILABLE_MESSAGE =
  /can'?t reach database server|database server (?:is )?not reachable|connection (?:refused|timed out|terminated|lost)|econnrefused|econnreset|etimedout|enotfound|server has closed the connection|too many connections|connection pool/i;

function isDatabaseUnavailable(exception: unknown): boolean {
  const error = exception as
    | { code?: unknown; name?: unknown; message?: unknown }
    | null
    | undefined;

  if (!error) return false;
  if (
    typeof error.code === 'string' &&
    DB_UNAVAILABLE_PRISMA_CODES.has(error.code)
  ) {
    return true;
  }
  if (error.name === 'PrismaClientInitializationError') {
    return true;
  }
  return DB_UNAVAILABLE_MESSAGE.test(String(error.message ?? ''));
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const incomingRequestId = request.headers['x-request-id'];
    const requestId =
      typeof incomingRequestId === 'string' &&
      REQUEST_ID_PATTERN.test(incomingRequestId)
        ? incomingRequestId
        : randomUUID();

    try {
      response.setHeader?.('x-request-id', requestId);
    } catch {
      // Test doubles may not implement headers.
    }

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';
    let details: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseBody = exceptionResponse as any;
        message = responseBody.message || message;
        code = responseBody.error || code;
        details = responseBody.details || null;

        // Handle validation errors (array of messages)
        if (Array.isArray(message)) {
          details = message;
          message = 'Validation failed';
          code = 'VALIDATION_ERROR';
        }
      }
    } else if (isDatabaseUnavailable(exception)) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      code = 'DATABASE_UNAVAILABLE';
      message =
        'The service is temporarily unavailable. Please try again in a moment.';
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const prismaMeta = (exception as any)?.meta;
    const prismaCode = (exception as any)?.code;
    const logContext = `${request.method} ${request.url} -> ${status} ${code} requestId=${requestId}`;

    // Expected infrastructure outages are logged but not reported to Sentry.
    if (code === 'DATABASE_UNAVAILABLE') {
      this.logger.warn(
        `${logContext} [${prismaCode ?? 'no-code'}]${
          prismaMeta ? ` meta=${JSON.stringify(prismaMeta)}` : ''
        } ${exception instanceof Error ? exception.message : String(exception)}`,
      );
    } else if (status >= 500) {
      this.logger.error(
        `${logContext}${prismaMeta ? ` meta=${JSON.stringify(prismaMeta)}` : ''}`,
        exception instanceof Error ? exception.stack : undefined,
      );
      Sentry.captureException(exception, {
        extra: {
          requestId,
          method: request.method,
          url: request.url,
          status,
          code,
        },
      });
    } else {
      this.logger.debug(
        `${logContext} ${firstLine(
          (exception as any)?.message ?? (message as unknown),
        )}`,
      );
    }

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        details,
        requestId,
      },
    });
  }
}
