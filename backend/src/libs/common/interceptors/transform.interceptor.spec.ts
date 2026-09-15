import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<any>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  function createCallHandler(response: any): CallHandler {
    return {
      handle: () => of(response),
    };
  }

  function createContext(): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => ({}),
      }),
      getHandler: () => () => {},
      getClass: () => class {},
    } as unknown as ExecutionContext;
  }

  it('should wrap plain response in success envelope', (done) => {
    const context = createContext();
    const callHandler = createCallHandler({ name: 'John' });

    interceptor.intercept(context, callHandler).subscribe((result) => {
      expect(result).toEqual({
        success: true,
        data: { name: 'John' },
      });
      done();
    });
  });

  it('should not wrap response that already has success property', (done) => {
    const context = createContext();
    const existingResponse = { success: true, data: { id: 1 }, custom: 'field' };
    const callHandler = createCallHandler(existingResponse);

    interceptor.intercept(context, callHandler).subscribe((result) => {
      expect(result).toEqual(existingResponse);
      done();
    });
  });

  it('should wrap primitive values', (done) => {
    const context = createContext();
    const callHandler = createCallHandler('hello');

    interceptor.intercept(context, callHandler).subscribe((result) => {
      expect(result).toEqual({
        success: true,
        data: 'hello',
      });
      done();
    });
  });

  it('should wrap arrays', (done) => {
    const context = createContext();
    const callHandler = createCallHandler([1, 2, 3]);

    interceptor.intercept(context, callHandler).subscribe((result) => {
      expect(result).toEqual({
        success: true,
        data: [1, 2, 3],
      });
      done();
    });
  });

  it('should wrap null values', (done) => {
    const context = createContext();
    const callHandler = createCallHandler(null);

    interceptor.intercept(context, callHandler).subscribe((result) => {
      expect(result).toEqual({
        success: true,
        data: null,
      });
      done();
    });
  });
});
