import { Test, TestingModule } from '@nestjs/testing';
import { SendEmailProcessor } from './send-email.processor';
import { PrismaService } from '../../libs/prisma/prisma.service';
import { EmailService } from '../../libs/email/email.service';

describe('SendEmailProcessor', () => {
  let processor: SendEmailProcessor;
  let prisma: any;
  let email: any;

  beforeEach(async () => {
    prisma = {
      notification: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };
    email = {
      send: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SendEmailProcessor,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: email },
      ],
    }).compile();

    processor = module.get<SendEmailProcessor>(SendEmailProcessor);
  });

  afterEach(() => jest.clearAllMocks());

  describe('process', () => {
    it('sends email and marks as SENT', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        id: 'n1', userId: 'user1', status: 'PENDING', title: 'Test', body: 'Hello',
      });
      prisma.user.findUnique.mockResolvedValue({ id: 'user1', email: 'test@test.com' });
      prisma.notification.update.mockResolvedValue({});

      await processor.process('n1');

      expect(email.send).toHaveBeenCalledWith({
        to: 'test@test.com',
        subject: 'Test',
        html: 'Hello',
      });
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'n1' },
        data: { status: 'SENT', sentAt: expect.any(Date) },
      });
    });

    it('skips if notification not found', async () => {
      prisma.notification.findUnique.mockResolvedValue(null);

      await processor.process('n999');

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(email.send).not.toHaveBeenCalled();
    });

    it('skips if notification already processed', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        id: 'n1', userId: 'user1', status: 'SENT', title: 'Test', body: 'Hello',
      });

      await processor.process('n1');

      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(email.send).not.toHaveBeenCalled();
    });

    it('skips if user has no email', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        id: 'n1', userId: 'user1', status: 'PENDING', title: 'Test', body: 'Hello',
      });
      prisma.user.findUnique.mockResolvedValue({ id: 'user1', email: null });

      await processor.process('n1');

      expect(email.send).not.toHaveBeenCalled();
    });

    it('marks as FAILED on email error', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        id: 'n1', userId: 'user1', status: 'PENDING', title: 'Test', body: 'Hello',
      });
      prisma.user.findUnique.mockResolvedValue({ id: 'user1', email: 'test@test.com' });
      email.send.mockRejectedValue(new Error('SMTP error'));
      prisma.notification.update.mockResolvedValue({});

      await processor.process('n1');

      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'n1' },
        data: { status: 'FAILED' },
      });
    });
  });
});
