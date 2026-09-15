import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { OwnershipGuard } from './ownership.guard';

describe('OwnershipGuard', () => {
  let guard: OwnershipGuard;

  beforeEach(() => {
    guard = new OwnershipGuard({} as any);
  });

  function createContext(user: any, params: any = {}) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user, params }),
      }),
      getHandler: () => () => {},
    } as unknown as ExecutionContext;
  }

  it('should allow ADMIN to access any resource', () => {
    const result = guard.canActivate(createContext(
      { id: 'admin-1', role: 'ADMIN' },
      { ownerId: 'other-user' },
    ));

    expect(result).toBe(true);
  });

  it('should allow access when params match user id', () => {
    const result = guard.canActivate(createContext(
      { id: 'user-1', role: 'CUSTOMER' },
      { userId: 'user-1' },
    ));

    expect(result).toBe(true);
  });

  it('should deny access when params do not match user id', () => {
    expect(() =>
      guard.canActivate(createContext(
        { id: 'user-1', role: 'CUSTOMER' },
        { userId: 'other-user' },
      )),
    ).toThrow(ForbiddenException);
  });

  it('should allow access when no owner params present', () => {
    const result = guard.canActivate(createContext(
      { id: 'user-1', role: 'CUSTOMER' },
      {},
    ));

    expect(result).toBe(true);
  });

  it('should check ownerId param as well', () => {
    expect(() =>
      guard.canActivate(createContext(
        { id: 'user-1', role: 'BUSINESS' },
        { ownerId: 'other-user' },
      )),
    ).toThrow(ForbiddenException);
  });

  it('should allow access when ownerId matches user id', () => {
    const result = guard.canActivate(createContext(
      { id: 'user-1', role: 'BUSINESS' },
      { ownerId: 'user-1' },
    ));

    expect(result).toBe(true);
  });
});
