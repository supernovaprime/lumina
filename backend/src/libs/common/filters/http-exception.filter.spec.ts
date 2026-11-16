import { HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  function createHost(exception: any) {
    const json = jest.fn();
    const statusFn = jest.fn().mockReturnValue({ json });
    return {
      switchToHttp: () => ({
        getResponse: () => ({ status: statusFn }),
        getRequest: () => ({
          headers: { 'x-request-id': 'test-req-1' },
          method: 'GET',
          url: '/test',
        }),
      }),
    };
  }

  it('should return 400 for validation errors', () => {
    const exception = new HttpException(
      { message: ['email must be an email'], error: 'Bad Request' },
      HttpStatus.BAD_REQUEST,
    );
    const host = createHost(exception);
    const statusFn = host.switchToHttp().getResponse().status;
    const json = statusFn().json;

    filter.catch(exception, host as any);

    expect(statusFn).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: ['email must be an email'],
        requestId: 'test-req-1',
      },
    });
  });

  it('should return 401 for unauthorized', () => {
    const exception = new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    const host = createHost(exception);
    const statusFn = host.switchToHttp().getResponse().status;
    const json = statusFn().json;

    filter.catch(exception, host as any);

    expect(statusFn).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Unauthorized',
        details: null,
        requestId: 'test-req-1',
      },
    });
  });

  it('should return 500 for internal errors', () => {
    const exception = new HttpException('Internal', HttpStatus.INTERNAL_SERVER_ERROR);
    const host = createHost(exception);
    const statusFn = host.switchToHttp().getResponse().status;
    const json = statusFn().json;

    filter.catch(exception, host as any);

    expect(statusFn).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal',
        details: null,
        requestId: 'test-req-1',
      },
    });
  });

  it('should return 503 when the database is unreachable', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const exception = Object.assign(
      new Error("Can't reach database server at db.example.com:5432"),
      { code: 'P1001' },
    );
    const host = createHost(exception);
    const statusFn = host.switchToHttp().getResponse().status;
    const json = statusFn().json;

    filter.catch(exception, host as any);

    expect(statusFn).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message:
          'The service is temporarily unavailable. Please try again in a moment.',
        details: null,
        requestId: 'test-req-1',
      },
    });
  });

  it('should return 503 for Prisma initialization failures without a code', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const exception = Object.assign(
      new Error('Timed out fetching a new connection from the pool'),
      { name: 'PrismaClientInitializationError' },
    );
    const host = createHost(exception);
    const statusFn = host.switchToHttp().getResponse().status;
    const json = statusFn().json;

    filter.catch(exception, host as any);

    expect(statusFn).toHaveBeenCalledWith(503);
    expect(json.mock.calls[0][0].error.code).toBe('DATABASE_UNAVAILABLE');
  });

  it('should include requestId in response', () => {
    const exception = new HttpException('Bad', HttpStatus.BAD_REQUEST);
    const host = createHost(exception);
    const json = host.switchToHttp().getResponse().status().json;

    filter.catch(exception, host as any);

    const callArgs = json.mock.calls[0][0];
    expect(callArgs.error.requestId).toBe('test-req-1');
  });

  it('should generate and echo a requestId when not present', () => {
    const exception = new HttpException('Bad', HttpStatus.BAD_REQUEST);
    const json = jest.fn();
    const setHeader = jest.fn();
    const statusFn = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status: statusFn, setHeader }),
        getRequest: () => ({
          headers: {},
          method: 'POST',
          url: '/other',
        }),
      }),
    };

    filter.catch(exception, host as any);

    const callArgs = json.mock.calls[0][0];
    expect(callArgs.error.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(setHeader).toHaveBeenCalledWith(
      'x-request-id',
      callArgs.error.requestId,
    );
  });
});
