import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../libs/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwt: any;
  let config: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      customer: {
        create: jest.fn(),
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
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

    it('should lowercase email', async () => {
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

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should throw ConflictException if email exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-user', email: 'test@example.com' });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should create customer profile for CUSTOMER role', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      const txCustomerCreate = jest.fn();
      prisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          user: { create: jest.fn().mockResolvedValue({ id: 'user-1', email: 'test@example.com' }) },
          customer: { create: txCustomerCreate },
        };
        return fn(tx);
      });

      await service.register(registerDto);

      expect(txCustomerCreate).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
          phone: '+1234567890',
        },
      });
    });

    it('should not create customer profile for BUSINESS role', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      const txCustomerCreate = jest.fn();
      prisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          user: { create: jest.fn().mockResolvedValue({ id: 'user-1', email: 'test@example.com' }) },
          customer: { create: txCustomerCreate },
        };
        return fn(tx);
      });

      await service.register({ ...registerDto, role: 'BUSINESS' });

      expect(txCustomerCreate).not.toHaveBeenCalled();
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
      expect(jwt.sign).toHaveBeenCalledWith(
        { sub: 'user-1', email: 'test@example.com', role: 'CUSTOMER' },
        { expiresIn: '15m' },
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', isActive: false });

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

    it('should update lastLoginAt on successful login', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        role: 'CUSTOMER',
        isActive: true,
        customer: null,
        business: null,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.user.update.mockResolvedValue({});

      await service.login(loginDto);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { lastLoginAt: expect.any(Date) },
      });
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'CUSTOMER',
        isActive: true,
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
});
