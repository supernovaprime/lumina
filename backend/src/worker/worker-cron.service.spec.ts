import { Test, TestingModule } from '@nestjs/testing';
import { WorkerCronService } from './worker-cron.service';
import { PrismaService } from '../libs/prisma/prisma.service';
import { SlotGeneratorService } from '../business/slot-generator.service';
import { SlotReconcilerService } from '../business/slot-reconciler.service';
import { NotificationService } from '../notification/notification.service';
import { BookingHoldExpiryProcessor } from './processors/booking-hold-expiry.processor';

describe('WorkerCronService', () => {
  let service: WorkerCronService;
  let prisma: any;
  let slotGenerator: any;
  let slotReconciler: any;
  let notifications: any;
  let holdExpiryProcessor: any;

  beforeEach(async () => {
    prisma = {
      business: { findMany: jest.fn().mockResolvedValue([]) },
      booking: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(),
    };
    slotGenerator = { generateSlots: jest.fn().mockResolvedValue({ created: 0 }) };
    slotReconciler = { reconcileFutureSlots: jest.fn().mockResolvedValue({ deleted: 0, orphaned: 0 }) };
    notifications = {
      enqueue: jest.fn().mockResolvedValue('notif-1'),
      notifyReviewRequest: jest.fn().mockResolvedValue(undefined),
    };
    holdExpiryProcessor = { process: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkerCronService,
        { provide: PrismaService, useValue: prisma },
        { provide: SlotGeneratorService, useValue: slotGenerator },
        { provide: SlotReconcilerService, useValue: slotReconciler },
        { provide: NotificationService, useValue: notifications },
        { provide: BookingHoldExpiryProcessor, useValue: holdExpiryProcessor },
      ],
    }).compile();

    service = module.get<WorkerCronService>(WorkerCronService);
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should start all cron timers', () => {
      service.onModuleInit();
      expect((service as any).timers.length).toBe(5);
    });
  });

  describe('onModuleDestroy', () => {
    it('should clear all cron timers', () => {
      service.onModuleInit();
      service.onModuleDestroy();
      expect((service as any).timers.length).toBe(0);
    });
  });

  describe('slot generation', () => {
    it('should run slot generation immediately on init', async () => {
      prisma.business.findMany.mockResolvedValue([
        { id: 'biz1' },
        { id: 'biz2' },
      ]);

      service.onModuleInit();

      await new Promise((r) => setTimeout(r, 50));
      expect(prisma.business.findMany).toHaveBeenCalledWith({
        where: { isActive: true, isVerified: true },
        select: { id: true },
      });
      expect(slotGenerator.generateSlots).toHaveBeenCalledWith('biz1', 30);
      expect(slotGenerator.generateSlots).toHaveBeenCalledWith('biz2', 30);
    });

    it('should handle no active businesses', async () => {
      prisma.business.findMany.mockResolvedValue([]);

      service.onModuleInit();

      await new Promise((r) => setTimeout(r, 50));
      expect(slotGenerator.generateSlots).not.toHaveBeenCalled();
    });

    it('should log error when slot generation fails', async () => {
      prisma.business.findMany.mockResolvedValue([{ id: 'biz1' }]);
      slotGenerator.generateSlots.mockRejectedValue(new Error('DB down'));

      service.onModuleInit();

      await new Promise((r) => setTimeout(r, 50));
    });
  });

  describe('slot reconciliation', () => {
    it('should run slot reconciliation on init', async () => {
      prisma.business.findMany.mockResolvedValue([{ id: 'biz1' }]);

      service.onModuleInit();

      await new Promise((r) => setTimeout(r, 50));
      expect(slotReconciler.reconcileFutureSlots).toHaveBeenCalledWith('biz1');
    });
  });

  describe('booking hold expiry', () => {
    it('should call holdExpiryProcessor.process on init', async () => {
      service.onModuleInit();

      await new Promise((r) => setTimeout(r, 50));
      expect(holdExpiryProcessor.process).toHaveBeenCalled();
    });

    it('should handle processor errors gracefully', async () => {
      holdExpiryProcessor.process.mockRejectedValue(new Error('DB down'));

      service.onModuleInit();

      await new Promise((r) => setTimeout(r, 50));
      expect(holdExpiryProcessor.process).toHaveBeenCalled();
    });
  });

  describe('reminders', () => {
    it('should send 24h reminders for upcoming bookings', async () => {
      const booking = {
        id: 'booking-1',
        date: new Date(),
        customerId: 'user-1',
        business: { name: 'Wash Co' },
      };
      prisma.booking.findMany.mockImplementation(async (args: any) => {
        if (args?.where?.status === 'PENDING') return [];
        if (args?.where?.status === 'COMPLETED') return [];
        if (args?.include?.customer) return [booking];
        return [];
      });

      service.onModuleInit();

      await new Promise((r) => setTimeout(r, 100));
      expect(notifications.enqueue).toHaveBeenCalledWith(
        'reminder-24h',
        'user-1',
        expect.objectContaining({ bookingId: 'booking-1' }),
      );
    });

    it('should send 2h reminders for soon bookings', async () => {
      const booking = {
        id: 'booking-2',
        date: new Date(),
        customerId: 'user-2',
        business: { name: 'Quick Wash' },
      };
      prisma.booking.findMany.mockImplementation(async (args: any) => {
        if (args?.where?.status === 'PENDING') return [];
        if (args?.where?.status === 'COMPLETED') return [];
        if (args?.include?.customer) return [booking];
        return [];
      });

      service.onModuleInit();

      await new Promise((r) => setTimeout(r, 100));
      expect(notifications.enqueue).toHaveBeenCalledWith(
        'reminder-2h',
        'user-2',
        expect.objectContaining({ bookingId: 'booking-2' }),
      );
    });
  });

  describe('review requests', () => {
    it('should send review requests for completed bookings', async () => {
      prisma.booking.findMany.mockResolvedValue([
        { id: 'booking-1', customerId: 'user-1' },
      ]);

      service.onModuleInit();

      await new Promise((r) => setTimeout(r, 50));
      expect(notifications.notifyReviewRequest).toHaveBeenCalledWith('booking-1');
    });

    it('should handle no completed bookings', async () => {
      prisma.booking.findMany.mockResolvedValue([]);

      service.onModuleInit();

      await new Promise((r) => setTimeout(r, 50));
      expect(notifications.notifyReviewRequest).not.toHaveBeenCalled();
    });
  });
});
