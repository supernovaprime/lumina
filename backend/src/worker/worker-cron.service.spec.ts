import { Test, TestingModule } from '@nestjs/testing';
import { WorkerCronService } from './worker-cron.service';
import { PrismaService } from '../libs/prisma/prisma.service';
import { SlotGeneratorService } from '../business/slot-generator.service';
import { SlotReconcilerService } from '../business/slot-reconciler.service';
import { BookingHoldExpiryProcessor } from './processors/booking-hold-expiry.processor';
import { SendEmailProcessor } from './processors/send-email.processor';
import { SendSmsProcessor } from './processors/send-sms.processor';
import { SendRemindersProcessor } from './processors/send-reminders.processor';
import { ReviewRequestProcessor } from './processors/review-request.processor';

describe('WorkerCronService', () => {
  let service: WorkerCronService;
  let prisma: any;
  let slotGenerator: any;
  let slotReconciler: any;
  let holdExpiryProcessor: any;
  let emailProcessor: any;
  let smsProcessor: any;
  let remindersProcessor: any;
  let reviewRequestProcessor: any;

  beforeEach(async () => {
    prisma = {
      business: { findMany: jest.fn().mockResolvedValue([]) },
      booking: { findMany: jest.fn().mockResolvedValue([]) },
      notification: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(),
    };
    slotGenerator = { generateSlots: jest.fn().mockResolvedValue({ created: 0 }) };
    slotReconciler = { reconcileFutureSlots: jest.fn().mockResolvedValue({ deleted: 0, orphaned: 0 }) };
    holdExpiryProcessor = { process: jest.fn().mockResolvedValue(undefined) };
    emailProcessor = { process: jest.fn().mockResolvedValue(undefined) };
    smsProcessor = { process: jest.fn().mockResolvedValue(undefined) };
    remindersProcessor = { process: jest.fn().mockResolvedValue({ sent24h: 0, sent2h: 0 }) };
    reviewRequestProcessor = { processPending: jest.fn().mockResolvedValue(0) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkerCronService,
        { provide: PrismaService, useValue: prisma },
        { provide: SlotGeneratorService, useValue: slotGenerator },
        { provide: SlotReconcilerService, useValue: slotReconciler },
        { provide: BookingHoldExpiryProcessor, useValue: holdExpiryProcessor },
        { provide: SendEmailProcessor, useValue: emailProcessor },
        { provide: SendSmsProcessor, useValue: smsProcessor },
        { provide: SendRemindersProcessor, useValue: remindersProcessor },
        { provide: ReviewRequestProcessor, useValue: reviewRequestProcessor },
      ],
    }).compile();

    service = module.get<WorkerCronService>(WorkerCronService);
  });

  afterEach(() => {
    service.onModuleDestroy();
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should start all 6 cron timers', () => {
      service.onModuleInit();
      expect((service as any).timers.length).toBe(6);
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
      prisma.business.findMany.mockResolvedValue([{ id: 'biz1' }, { id: 'biz2' }]);

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
    it('should delegate to remindersProcessor', async () => {
      service.onModuleInit();

      await new Promise((r) => setTimeout(r, 50));
      expect(remindersProcessor.process).toHaveBeenCalled();
    });

    it('should handle processor errors gracefully', async () => {
      remindersProcessor.process.mockRejectedValue(new Error('DB down'));

      service.onModuleInit();

      await new Promise((r) => setTimeout(r, 50));
      expect(remindersProcessor.process).toHaveBeenCalled();
    });
  });

  describe('review requests', () => {
    it('should delegate to reviewRequestProcessor.processPending', async () => {
      service.onModuleInit();

      await new Promise((r) => setTimeout(r, 50));
      expect(reviewRequestProcessor.processPending).toHaveBeenCalled();
    });

    it('should handle processor errors gracefully', async () => {
      reviewRequestProcessor.processPending.mockRejectedValue(new Error('DB down'));

      service.onModuleInit();

      await new Promise((r) => setTimeout(r, 50));
      expect(reviewRequestProcessor.processPending).toHaveBeenCalled();
    });
  });

  describe('notification retry', () => {
    it('should retry failed email notifications', async () => {
      prisma.notification.findMany.mockResolvedValue([
        { id: 'n1', channel: 'EMAIL', status: 'FAILED' },
      ]);

      service.onModuleInit();

      await new Promise((r) => setTimeout(r, 50));
      expect(emailProcessor.process).toHaveBeenCalledWith('n1');
    });

    it('should retry failed SMS notifications', async () => {
      prisma.notification.findMany.mockResolvedValue([
        { id: 'n2', channel: 'SMS', status: 'FAILED' },
      ]);

      service.onModuleInit();

      await new Promise((r) => setTimeout(r, 50));
      expect(smsProcessor.process).toHaveBeenCalledWith('n2');
    });

    it('should skip when no failed notifications', async () => {
      prisma.notification.findMany.mockResolvedValue([]);

      service.onModuleInit();

      await new Promise((r) => setTimeout(r, 50));
      expect(emailProcessor.process).not.toHaveBeenCalled();
      expect(smsProcessor.process).not.toHaveBeenCalled();
    });

    it('should handle retry errors gracefully', async () => {
      prisma.notification.findMany.mockResolvedValue([
        { id: 'n1', channel: 'EMAIL', status: 'FAILED' },
      ]);
      emailProcessor.process.mockRejectedValue(new Error('Send fail'));

      service.onModuleInit();

      await new Promise((r) => setTimeout(r, 50));
      expect(emailProcessor.process).toHaveBeenCalledWith('n1');
    });

    it('should skip retry when prisma.notification is unavailable', async () => {
      prisma.notification = undefined;

      service.onModuleInit();

      await new Promise((r) => setTimeout(r, 50));
      expect(emailProcessor.process).not.toHaveBeenCalled();
    });
  });

  describe('DB unavailable handling', () => {
    it('should detect Prisma P2021 error and mark DB unavailable', async () => {
      prisma.business.findMany.mockRejectedValue(
        Object.assign(new Error('The table `Business` does not exist'), { code: 'P2021' }),
      );

      service.onModuleInit();
      await new Promise((r) => setTimeout(r, 50));

      expect((service as any).dbAvailable).toBe(false);
      expect((service as any).consecutiveFailures).toBeGreaterThanOrEqual(1);
    });

    it('should detect Prisma P1001 error and mark DB unavailable', async () => {
      prisma.business.findMany.mockRejectedValue(
        Object.assign(new Error("Can't reach database server"), { code: 'P1001' }),
      );

      service.onModuleInit();
      await new Promise((r) => setTimeout(r, 50));

      expect((service as any).dbAvailable).toBe(false);
    });

    it('should detect connection error by message text', async () => {
      prisma.business.findMany.mockRejectedValue(
        new Error('Connection refused to database'),
      );

      service.onModuleInit();
      await new Promise((r) => setTimeout(r, 50));

      expect((service as any).dbAvailable).toBe(false);
    });

    it('should recover when DB becomes available again', async () => {
      prisma.business.findMany.mockRejectedValue(
        Object.assign(new Error('Table not found'), { code: 'P2021' }),
      );
      service.onModuleInit();
      await new Promise((r) => setTimeout(r, 50));
      expect((service as any).dbAvailable).toBe(false);

      prisma.business.findMany.mockResolvedValue([{ id: 'biz1' }]);
      service.onModuleInit();
      await new Promise((r) => setTimeout(r, 50));
      expect((service as any).dbAvailable).toBe(true);
      expect((service as any).consecutiveFailures).toBe(0);
    });

    it('should skip crons when DB already marked unavailable', async () => {
      (service as any).dbAvailable = false;
      (service as any).consecutiveFailures = 3;

      service.onModuleInit();
      await new Promise((r) => setTimeout(r, 50));

      expect(prisma.business.findMany).not.toHaveBeenCalled();
    });
  });
});
