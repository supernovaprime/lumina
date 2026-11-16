import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../libs/prisma/prisma.service';
import { CacheService } from '../../libs/cache/cache.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prisma: any;
  let config: any;
  let cache: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
    };

    config = {
      get: jest.fn().mockReturnValue('test-secret'),
    };

    cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
        { provide: CacheService, useValue: cache },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  afterEach(() => jest.clearAllMocks());

  describe('validate', () => {
    it('should return user if found and active', async () => {
      const mockDbUser = {
        id: 'user-1',
        email: 'test@example.com',
        role: 'CUSTOMER',
        isActive: true,
        tokenVersion: 0,
      };
      prisma.user.findUnique.mockResolvedValue(mockDbUser);

      const result = await strategy.validate({ sub: 'user-1', email: 'test@example.com', role: 'CUSTOMER' });

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        role: 'CUSTOMER',
        isActive: true,
        tokenVersion: 0,
      });
      expect(cache.set).toHaveBeenCalled();
    });

    it('should use the cached principal when available', async () => {
      cache.get.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        role: 'ADMIN',
        isActive: true,
        tokenVersion: 2,
      });

      const result = await strategy.validate({ sub: 'user-1' });

      expect(result.role).toBe('ADMIN');
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        strategy.validate({ sub: 'nonexistent', email: 'test@example.com', role: 'CUSTOMER' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', isActive: false });

      await expect(
        strategy.validate({ sub: 'user-1', email: 'test@example.com', role: 'CUSTOMER' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
