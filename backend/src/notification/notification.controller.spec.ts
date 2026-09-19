import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { PrismaService } from '../libs/prisma/prisma.service';

describe('NotificationController', () => {
  let controller: NotificationController;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      notification: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('returns paginated notifications', async () => {
      prisma.notification.findMany.mockResolvedValue([
        { id: 'n1', title: 'Test', body: 'Hello', status: 'SENT' },
      ]);
      prisma.notification.count.mockResolvedValue(1);

      const result = await controller.list({ userId: 'user1' });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('returns empty list', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      const result = await controller.list({ userId: 'user1' });
      expect(result.data).toHaveLength(0);
    });
  });

  describe('markAsRead', () => {
    it('marks notification as read', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        id: 'n1', userId: 'user1', status: 'SENT',
      });
      prisma.notification.update.mockResolvedValue({});

      const result = await controller.markAsRead({ userId: 'user1' }, 'n1');
      expect(result.message).toBe('Notification marked as read');
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'n1' },
        data: { status: 'READ' },
      });
    });

    it('returns message for not found notification', async () => {
      prisma.notification.findUnique.mockResolvedValue(null);

      const result = await controller.markAsRead({ userId: 'user1' }, 'n999');
      expect(result.message).toBe('Notification not found');
    });

    it('returns message for notification belonging to different user', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        id: 'n1', userId: 'other-user', status: 'SENT',
      });

      const result = await controller.markAsRead({ userId: 'user1' }, 'n1');
      expect(result.message).toBe('Notification not found');
    });
  });

  describe('markAllAsRead', () => {
    it('marks all notifications as read', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await controller.markAllAsRead({ userId: 'user1' });
      expect(result.message).toBe('All notifications marked as read');
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user1', status: { not: 'READ' } },
        data: { status: 'READ' },
      });
    });
  });
});
