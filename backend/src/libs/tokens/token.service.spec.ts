import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from './token.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TokenService', () => {
  let service: TokenService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      verificationToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
      passwordResetToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('createVerificationToken', () => {
    it('returns hex string of length 64', async () => {
      prisma.verificationToken.create.mockResolvedValue({});
      const result = await service.createVerificationToken('user1');
      expect(result).toMatch(/^[a-f0-9]{64}$/);
    });

    it('stores record in DB', async () => {
      prisma.verificationToken.create.mockResolvedValue({});
      await service.createVerificationToken('user1');
      expect(prisma.verificationToken.create).toHaveBeenCalled();
    });
  });

  describe('consumeVerificationToken', () => {
    it('returns userId for valid token', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue({
        userId: 'user1',
        usedAt: null,
        expiresAt: new Date(Date.now() + 3600000),
      });
      prisma.verificationToken.update.mockResolvedValue({});
      const result = await service.consumeVerificationToken('token1');
      expect(result).toBe('user1');
    });

    it('returns null for expired token', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue({
        userId: 'user1',
        usedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      });
      const result = await service.consumeVerificationToken('token1');
      expect(result).toBeNull();
    });

    it('returns null for already-used token', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue({
        userId: 'user1',
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      });
      const result = await service.consumeVerificationToken('token1');
      expect(result).toBeNull();
    });

    it('returns null for invalid token', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue(null);
      const result = await service.consumeVerificationToken('invalid');
      expect(result).toBeNull();
    });
  });

  describe('consumePasswordResetToken', () => {
    it('works same as verification token', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        userId: 'user1',
        usedAt: null,
        expiresAt: new Date(Date.now() + 3600000),
      });
      prisma.passwordResetToken.update.mockResolvedValue({});
      const result = await service.consumePasswordResetToken('token1');
      expect(result).toBe('user1');
    });
  });

  describe('cleanup', () => {
    it('deletes expired tokens', async () => {
      prisma.verificationToken.deleteMany.mockResolvedValue({ count: 3 });
      prisma.passwordResetToken.deleteMany.mockResolvedValue({ count: 2 });
      const result = await service.cleanup();
      expect(result).toBe(5);
    });
  });
});
