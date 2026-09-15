import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../libs/prisma/prisma.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prisma: any;
  let config: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
    };

    config = {
      get: jest.fn().mockReturnValue('test-secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
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
        tokenVersion: 0,
      });
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
