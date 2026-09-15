import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createContext(user?: any, handlerRoles?: string[]) {
    const mockHandler = () => {};
    if (handlerRoles) {
      Reflect.defineMetadata('roles', handlerRoles, mockHandler);
    }

    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => mockHandler,
    } as unknown as ExecutionContext;
  }

  it('should allow access when no roles are required', () => {
    reflector.get = jest.fn().mockReturnValue(null);

    const result = guard.canActivate(createContext({ role: 'CUSTOMER' }));

    expect(result).toBe(true);
  });

  it('should allow access when user has required role', () => {
    reflector.get = jest.fn().mockReturnValue(['ADMIN']);

    const result = guard.canActivate(createContext({ role: 'ADMIN' }, ['ADMIN']));

    expect(result).toBe(true);
  });

  it('should deny access when user does not have required role', () => {
    reflector.get = jest.fn().mockReturnValue(['ADMIN']);

    const result = guard.canActivate(createContext({ role: 'CUSTOMER' }, ['ADMIN']));

    expect(result).toBe(false);
  });

  it('should deny access when user is not present', () => {
    reflector.get = jest.fn().mockReturnValue(['ADMIN']);

    const result = guard.canActivate(createContext(undefined, ['ADMIN']));

    expect(result).toBe(false);
  });

  it('should allow access when multiple roles include user role', () => {
    reflector.get = jest.fn().mockReturnValue(['ADMIN', 'BUSINESS']);

    const result = guard.canActivate(createContext({ role: 'BUSINESS' }, ['ADMIN', 'BUSINESS']));

    expect(result).toBe(true);
  });
});
