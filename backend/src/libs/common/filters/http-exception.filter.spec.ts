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

  it('should include requestId in response', () => {
    const exception = new HttpException('Bad', HttpStatus.BAD_REQUEST);
    const host = createHost(exception);
    const json = host.switchToHttp().getResponse().status().json;

    filter.catch(exception, host as any);

    const callArgs = json.mock.calls[0][0];
    expect(callArgs.error.requestId).toBe('test-req-1');
  });

  it('should default requestId to unknown when not present', () => {
    const exception = new HttpException('Bad', HttpStatus.BAD_REQUEST);
    const json = jest.fn();
    const statusFn = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status: statusFn }),
        getRequest: () => ({
          headers: {},
          method: 'POST',
          url: '/other',
        }),
      }),
    };

    filter.catch(exception, host as any);

    const callArgs = json.mock.calls[0][0];
    expect(callArgs.error.requestId).toBe('unknown');
  });
});
