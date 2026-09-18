import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../libs/prisma/prisma.service';
import { SmsService } from '../../libs/sms/sms.service';

@Injectable()
export class SendSmsProcessor {
  private readonly logger = new Logger(SendSmsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsService,
  ) {}

  async process(notificationId: string): Promise<void> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    } as any);

    if (!notification || notification.status !== 'PENDING') return;

    const user = await this.prisma.user.findUnique({
      where: { id: notification.userId },
    });

    const phone = user?.phone;

    if (!phone) {
      this.logger.warn(`No phone number for notification ${notificationId} user ${notification.userId}`);
      return;
    }

    try {
      const result = await this.sms.send({
        to: phone,
        message: notification.body,
      });

      if (result.success) {
        await this.prisma.notification.update({
          where: { id: notificationId },
          data: { status: 'SENT', sentAt: new Date() },
        });
      } else {
        await this.prisma.notification.update({
          where: { id: notificationId },
          data: { status: 'FAILED' },
        });
      }
    } catch (err) {
      this.logger.error(`SMS send failed for notification ${notificationId}: ${(err as Error).message}`);
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { status: 'FAILED' },
      });
    }
  }
}
