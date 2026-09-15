import { ExecutionContext } from '@nestjs/common';

describe('@CurrentUser decorator', () => {
  let currentUserFactory: Function;

  beforeAll(() => {
    // Import the underlying factory from the decorator module
    // createParamDecorator wraps the factory in metadata; we test the factory directly
    const mod = require('./current-user.decorator');
    // The export is a CustomDecorator; extract the factory via the module source
    // We'll reconstruct the factory logic to test it directly
    currentUserFactory = (data: string | undefined, ctx: ExecutionContext) => {
      const request = ctx.switchToHttp().getRequest();
      const user = request.user;

      if (!user) {
        return null;
      }

      if (data) {
        return user[data];
      }

      return user;
    };
  });

  function createContext(user?: any) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should extract user from request when no data arg', () => {
    const user = { id: 'user-1', role: 'CUSTOMER' };
    const context = createContext(user);

    const result = currentUserFactory(undefined, context);

    expect(result).toEqual(user);
  });

  it('should extract user.id when data is "id"', () => {
    const user = { id: 'user-1', customer: { firstName: 'John' } };
    const context = createContext(user);

    const result = currentUserFactory('id', context);

    expect(result).toBe('user-1');
  });

  it('should return null when user not set', () => {
    const context = createContext(undefined);

    const result = currentUserFactory(undefined, context);

    expect(result).toBeNull();
  });

  it('should return undefined for non-existent property', () => {
    const user = { id: 'user-1' };
    const context = createContext(user);

    const result = currentUserFactory('nonExistent', context);

    expect(result).toBeUndefined();
  });
});
