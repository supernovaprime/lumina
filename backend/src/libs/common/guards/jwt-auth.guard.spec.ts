import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('returns the authenticated user', () => {
    const user = { id: 'user-1', role: 'ADMIN' };

    expect(guard.handleRequest(null, user, null)).toBe(user);
  });

  it('throws UnauthorizedException when no user is present', () => {
    expect(() => guard.handleRequest(null, null, null)).toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException for an expired token', () => {
    expect(() =>
      guard.handleRequest(null, null, { name: 'TokenExpiredError' }),
    ).toThrow('Session expired. Please sign in again.');
  });

  it('throws UnauthorizedException when the strategy fails', () => {
    expect(() =>
      guard.handleRequest(new Error('invalid signature'), null, null),
    ).toThrow(UnauthorizedException);
  });

  it('preserves an existing UnauthorizedException', () => {
    const error = new UnauthorizedException('User not found or inactive');

    expect(() => guard.handleRequest(error, null, null)).toThrow(error);
  });
});
