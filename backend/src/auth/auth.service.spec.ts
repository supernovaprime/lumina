import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../libs/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenService } from '../libs/tokens/token.service';
import { RateLimitService } from '../libs/rate-limit/rate-limit.service';
import { NotificationService } from '../notification/notification.service';
import { CacheService } from '../libs/cache/cache.service';
import { ConflictException, UnauthorizedException, BadRequestException, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwt: any;
  let config: any;
  let tokenService: any;
  let rateLimit: any;
  let notificationService: any;
  let cache: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      customer: {
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    jwt = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    config = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const configMap: Record<string, string> = {
          JWT_EXPIRES_IN: '15m',
        };
        return configMap[key] || defaultValue;
      }),
    };

    tokenService = {
      createVerificationToken: jest.fn().mockResolvedValue('verify-token-123'),
      createPasswordResetToken: jest.fn().mockResolvedValue('reset-token-123'),
      consumeVerificationToken: jest.fn(),
      consumePasswordResetToken: jest.fn(),
    };

    notificationService = {
      enqueue: jest.fn().mockResolvedValue('notif-1'),
    };

    cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    rateLimit = {
      isBlocked: jest.fn().mockResolvedValue({ blocked: false }),
      recordFailedAttempt: jest.fn().mockResolvedValue({ blocked: false, attemptsRemaining: 4 }),
      resetAttempts: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
        { provide: TokenService, useValue: tokenService },
        { provide: RateLimitService, useValue: rateLimit },
        { provide: NotificationService, useValue: notificationService },
        { provide: CacheService, useValue: cache },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'Test@Example.COM',
      password: 'password123',
      role: 'CUSTOMER' as const,
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
    };

    it('should register a new customer successfully', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      prisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          user: { create: jest.fn().mockResolvedValue({ id: 'user-1', email: 'test@example.com' }) },
          customer: { create: jest.fn() },
        };
        return fn(tx);
      });

      const result = await service.register(registerDto);

      expect(result).toEqual({
        userId: 'user-1',
        email: 'test@example.com',
        requiresVerification: true,
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
    });

    it('should create verification token and send email on register', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      prisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          user: { create: jest.fn().mockResolvedValue({ id: 'user-1', email: 'test@example.com' }) },
          customer: { create: jest.fn() },
        };
        return fn(tx);
      });

      await service.register(registerDto);

      expect(tokenService.createVerificationToken).toHaveBeenCalledWith('user-1');
      expect(notificationService.enqueue).toHaveBeenCalledWith('email-verification', 'user-1', {
        token: 'verify-token-123',
        email: 'test@example.com',
      });
    });

    it('should throw ConflictException if email exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-user', email: 'test@example.com' });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'password123' };

    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        role: 'CUSTOMER',
        isActive: true,
        customer: { firstName: 'John', lastName: 'Doe' },
        business: null,
      };
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.user.update.mockResolvedValue({});

      const result = await service.login(loginDto);

      expect(result).toEqual({
        user: { id: 'user-1', email: 'test@example.com', role: 'CUSTOMER' },
        customer: { firstName: 'John', lastName: 'Doe' },
        business: null,
        accessToken: 'mock-jwt-token',
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        isActive: true,
        passwordHash: 'hashed-password',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should record failed attempt on wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        isActive: true,
        passwordHash: 'hashed-password',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      rateLimit.recordFailedAttempt.mockResolvedValue({ blocked: false, attemptsRemaining: 3 });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(rateLimit.recordFailedAttempt).toHaveBeenCalledWith('test@example.com');
    });

    it('should record failed attempt when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(rateLimit.recordFailedAttempt).toHaveBeenCalledWith('test@example.com');
    });

    it('should throw 429 when account is blocked', async () => {
      rateLimit.isBlocked.mockResolvedValue({ blocked: true, retryAfterSeconds: 600 });

      try {
        await service.login(loginDto);
        fail('Expected HttpException');
      } catch (err: any) {
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      }
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should throw 429 after 5th failed attempt', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        isActive: true,
        passwordHash: 'hashed-password',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      rateLimit.recordFailedAttempt.mockResolvedValue({ blocked: true, attemptsRemaining: 0, retryAfterSeconds: 900 });

      try {
        await service.login(loginDto);
        fail('Expected HttpException');
      } catch (err: any) {
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      }
    });

    it('should reset attempts on successful login', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        role: 'CUSTOMER',
        isActive: true,
        customer: { firstName: 'John', lastName: 'Doe' },
        business: null,
      };
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.user.update.mockResolvedValue({});

      await service.login(loginDto);

      expect(rateLimit.resetAttempts).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'CUSTOMER',
        isActive: true,
        emailVerified: new Date(),
        createdAt: new Date(),
        customer: { firstName: 'John' },
        business: null,
      };
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile('user-1');

      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('nonexistent')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('should always return 200 even if user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword({ email: 'nonexistent@example.com' });

      expect(result).toEqual({ message: 'If an account with that email exists, a reset link has been sent' });
      expect(tokenService.createPasswordResetToken).not.toHaveBeenCalled();
    });

    it('should create reset token and send email if user exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'test@example.com', isActive: true });

      const result = await service.forgotPassword({ email: 'test@example.com' });

      expect(result).toEqual({ message: 'If an account with that email exists, a reset link has been sent' });
      expect(tokenService.createPasswordResetToken).toHaveBeenCalledWith('user-1');
      expect(notificationService.enqueue).toHaveBeenCalledWith('password-reset', 'user-1', {
        token: 'reset-token-123',
        email: 'test@example.com',
      });
    });

    it('should not create token if user is inactive', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'test@example.com', isActive: false });

      await service.forgotPassword({ email: 'test@example.com' });

      expect(tokenService.createPasswordResetToken).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      tokenService.consumePasswordResetToken.mockResolvedValue('user-1');
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
      prisma.user.update.mockResolvedValue({});

      const result = await service.resetPassword({ token: 'valid-token', newPassword: 'newpassword123' });

      expect(result).toEqual({ message: 'Password reset successful' });
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 12);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          passwordHash: 'new-hashed-password',
          tokenVersion: { increment: 1 },
        },
      });
    });

    it('should throw BadRequestException with invalid token', async () => {
      tokenService.consumePasswordResetToken.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: 'invalid-token', newPassword: 'newpassword123' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with valid token', async () => {
      tokenService.consumeVerificationToken.mockResolvedValue('user-1');
      prisma.user.update.mockResolvedValue({});

      const result = await service.verifyEmail({ token: 'valid-token' });

      expect(result).toEqual({ message: 'Email verified successfully' });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { emailVerified: expect.any(Date) },
      });
    });

    it('should throw BadRequestException with invalid token', async () => {
      tokenService.consumeVerificationToken.mockResolvedValue(null);

      await expect(service.verifyEmail({ token: 'invalid-token' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateProfile', () => {
    it('should update customer profile', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'CUSTOMER',
        isActive: true,
        emailVerified: new Date(),
        createdAt: new Date(),
        customer: { id: 'cust-1', firstName: 'John', lastName: 'Doe', phone: null },
        business: null,
      };
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.customer.update.mockResolvedValue({ ...mockUser.customer, firstName: 'Jane', lastName: 'Smith' });

      const result = await service.updateProfile('user-1', { firstName: 'Jane', lastName: 'Smith' });

      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { firstName: 'Jane', lastName: 'Smith' },
      });
      expect(result.customer!.firstName).toBe('Jane');
    });

    it('should update phone only', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'CUSTOMER',
        isActive: true,
        emailVerified: null,
        createdAt: new Date(),
        customer: { id: 'cust-1', firstName: 'John', lastName: 'Doe', phone: null },
        business: null,
      };
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.customer.update.mockResolvedValue({ ...mockUser.customer, phone: '+1234567890' });

      await service.updateProfile('user-1', { phone: '+1234567890' });

      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { phone: '+1234567890' },
      });
    });

    it('should return current profile if no fields provided', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'CUSTOMER',
        isActive: true,
        emailVerified: null,
        createdAt: new Date(),
        customer: { id: 'cust-1', firstName: 'John', lastName: 'Doe' },
        business: null,
      };
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.updateProfile('user-1', {});

      expect(result).toEqual(mockUser);
      expect(prisma.customer.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.updateProfile('nonexistent', { firstName: 'Jane' })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if customer profile not found', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        customer: null,
        business: null,
      });

      await expect(service.updateProfile('user-1', { firstName: 'Jane' })).rejects.toThrow(BadRequestException);
    });
  });
});
