import { Test, TestingModule } from '@nestjs/testing';
import { IdempotencyService } from './idempotency.service';
import { PrismaService } from '../prisma/prisma.service';

describe('IdempotencyService', () => {
  let service: IdempotencyService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      idempotencyKey: {
        findUnique: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<IdempotencyService>(IdempotencyService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('check', () => {
    it('returns null when key does not exist', async () => {
      prisma.idempotencyKey.findUnique.mockResolvedValue(null);
      const result = await service.check('key1', 'user1');
      expect(result).toBeNull();
      expect(prisma.idempotencyKey.create).toHaveBeenCalled();
    });

    it('creates record with 24h expiry', async () => {
      prisma.idempotencyKey.findUnique.mockResolvedValue(null);
      await service.check('key1', 'user1');
      const call = prisma.idempotencyKey.create.mock.calls[0][0];
      expect(call.data.key).toBe('key1');
      expect(call.data.userId).toBe('user1');
      expect(call.data.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('returns stored response on duplicate key for same user', async () => {
      const stored = { bookingId: 'b1', status: 'PENDING' };
      prisma.idempotencyKey.findUnique.mockResolvedValue({ key: 'key1', userId: 'user1', response: stored });
      const result = await service.check('key1', 'user1');
      expect(result).toEqual(stored);
    });

    it('returns null for different user with same key', async () => {
      prisma.idempotencyKey.findUnique.mockResolvedValue({ key: 'key1', userId: 'user2', response: {} });
      const result = await service.check('key1', 'user1');
      expect(result).toBeNull();
    });
  });

  describe('store', () => {
    it('updates response field', async () => {
      prisma.idempotencyKey.updateMany.mockResolvedValue({ count: 1 });
      await service.store('key1', 'user1', { data: 'test' });
      expect(prisma.idempotencyKey.updateMany).toHaveBeenCalledWith({
        where: { key: 'key1', userId: 'user1' },
        data: { response: { data: 'test' } },
      });
    });
  });

  describe('cleanup', () => {
    it('deletes expired keys', async () => {
      prisma.idempotencyKey.deleteMany.mockResolvedValue({ count: 5 });
      const result = await service.cleanup();
      expect(result).toBe(5);
    });

    it('returns 0 when no expired keys', async () => {
      prisma.idempotencyKey.deleteMany.mockResolvedValue({ count: 0 });
      const result = await service.cleanup();
      expect(result).toBe(0);
    });
  });
});
