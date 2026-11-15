import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
// @ts-ignore - @nestjs/swagger types may not be installed
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as Sentry from '@sentry/nestjs';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './libs/common/filters/http-exception.filter';
import { TransformInterceptor } from './libs/common/interceptors/transform.interceptor';
import { HealthService } from './libs/health/health.service';

function printBanner() {
  const bold = '\x1b[1m';
  const reset = '\x1b[0m';
  const dim = '\x1b[2m';

  const c1 = '\x1b[38;2;0;255;255m';
  const c2 = '\x1b[38;2;128;0;255m';
  const c3 = '\x1b[38;2;255;0;200m';
  const c4 = '\x1b[38;2;255;200;0m';

  const P = '  ║';
  const lines = [
    c1 + '  ╔' + '═'.repeat(49) + '╗' + reset,
    c2 + P + ' '.repeat(49) + '║' + reset,
    c3 + P + '   ' + bold + 'L  U  M  I  N  A' + reset + c3 + ' '.repeat(30) + '║' + reset,
    c4 + P + ' '.repeat(49) + '║' + reset,
    c1 + P + '        ' + bold + 'Car Wash Booking Platform' + reset + c1 + ' '.repeat(16) + '║' + reset,
    c2 + P + '        ' + dim + 'v1.0.0 · NestJS · Prisma · PostgreSQL' + reset + c2 + ' '.repeat(4) + '║' + reset,
    c3 + P + ' '.repeat(49) + '║' + reset,
    c4 + '  ╚' + '═'.repeat(49) + '╝' + reset,
  ];

  console.log('\n' + lines.join('\n'));
}

async function bootstrap() {
  printBanner();

  const logger = new Logger('Bootstrap');

  const sentryDsn = process.env.SENTRY_DSN;
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.1,
    });
    logger.log('Sentry initialized');
  }

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
    rawBody: true,
  });

  const configService = app.get(ConfigService);

  const logLevel = (configService.get<string>('LOG_LEVEL') || 'info').toLowerCase();
  const loggerLevels: Record<string, LogLevel[]> = {
    error: ['error'],
    warn: ['error', 'warn'],
    info: ['error', 'warn', 'log'],
    debug: ['error', 'warn', 'log', 'debug'],
    verbose: ['error', 'warn', 'log', 'debug', 'verbose'],
  };
  app.useLogger(loggerLevels[logLevel] ?? loggerLevels.info);
  logger.log(`Log level: ${loggerLevels[logLevel] ? logLevel : 'info'}`);

  const port = configService.get<number>('PORT', 7000);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  const corsOrigin = configService.get<string>(
    'CORS_ORIGIN',
    'http://localhost:8000,http://localhost:3000',
  );
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // Request correlation for logs and error responses
  app.use((req: Request, res: Response, next: NextFunction) => {
    const incoming = req.headers['x-request-id'];
    const requestId =
      typeof incoming === 'string' && /^[\w.-]{1,128}$/.test(incoming)
        ? incoming
        : randomUUID();
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  });

  // Security
  app.use(helmet());

  // CORS
  const configuredOrigins = corsOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  // Local frontend dev servers should always work while developing, even if
  // CORS_ORIGIN in .env was copied from an older example.
  const devOrigins =
    nodeEnv === 'development'
      ? ['http://localhost:8000', 'http://localhost:3000']
      : [];

  const allowedOrigins = [...new Set([...configuredOrigins, ...devOrigins])];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix(apiPrefix);

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger (only in development)
  if (nodeEnv === 'development') {
    const config = new DocumentBuilder()
      .setTitle('LUMINA API')
      .setDescription('LUMINA Car Wash Booking Platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(port);

  const green = '\x1b[32m';
  const cyan = '\x1b[36m';
  const yellow = '\x1b[33m';
  const dim = '\x1b[2m';
  const bold = '\x1b[1m';
  const reset = '\x1b[0m';

  logger.log(`${green}${bold}● Server ready${reset} ${dim}→${reset} ${cyan}http://localhost:${port}/${apiPrefix}${reset}`);
  if (nodeEnv === 'development') {
    logger.log(`${yellow}${bold}● Swagger UI${reset}  ${dim}→${reset} ${cyan}http://localhost:${port}/api/docs${reset}`);
  }
  logger.log(`${dim}Environment${reset}  ${nodeEnv === 'production' ? green : yellow}${nodeEnv}${reset}`);
  logger.log(`${dim}PID${reset}         ${process.pid}`);
  logger.log(`${dim}Memory${reset}      ${dim}${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)}MB${reset}`);

  // Health check
  const health = app.get(HealthService);
  const report = await health.checkAll();
  health.logHealthReport(report);
}
bootstrap();
