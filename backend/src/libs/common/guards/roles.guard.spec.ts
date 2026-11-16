import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;

  beforeEach(() => {
    guard = new RolesGuard(new Reflector());
  });

  function createContext(
    user?: any,
    metadata: { handlerRoles?: string[]; classRoles?: string[] } = {},
  ) {
    const handler = () => {};
    class TestController {}

    if (metadata.handlerRoles) {
      Reflect.defineMetadata('roles', metadata.handlerRoles, handler);
    }

    if (metadata.classRoles) {
      Reflect.defineMetadata('roles', metadata.classRoles, TestController);
    }

    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => handler,
      getClass: () => TestController,
    } as unknown as ExecutionContext;
  }

  it('allows access when no roles are required', () => {
    expect(guard.canActivate(createContext({ role: 'CUSTOMER' }))).toBe(true);
  });

  it('allows an admin through a class-level role rule', () => {
    const context = createContext(
      { role: 'ADMIN' },
      { classRoles: ['ADMIN'] },
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies a non-admin through a class-level role rule', () => {
    const context = createContext(
      { role: 'CUSTOMER' },
      { classRoles: ['ADMIN'] },
    );

    expect(guard.canActivate(context)).toBe(false);
  });

  it('allows access when the user has a required handler role', () => {
    const context = createContext(
      { role: 'BUSINESS' },
      { handlerRoles: ['ADMIN', 'BUSINESS'] },
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it('lets handler roles override class roles', () => {
    const context = createContext(
      { role: 'ADMIN' },
      { handlerRoles: ['ADMIN'], classRoles: ['BUSINESS'] },
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies access when the user is missing', () => {
    const context = createContext(undefined, { classRoles: ['ADMIN'] });

    expect(guard.canActivate(context)).toBe(false);
  });
});
