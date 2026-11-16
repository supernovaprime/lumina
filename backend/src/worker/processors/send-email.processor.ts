import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../libs/prisma/prisma.service';
import { EmailService } from '../../libs/email/email.service';

@Injectable()
export class SendEmailProcessor {
  private readonly logger = new Logger(SendEmailProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async process(notificationId: string): Promise<void> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      select: {
        id: true,
        userId: true,
        title: true,
        body: true,
        status: true,
      },
    } as any);

    if (!notification || notification.status !== 'PENDING') return;

    const user = await this.prisma.user.findUnique({
      where: { id: notification.userId },
      select: { email: true },
    });

    if (!user?.email) {
      this.logger.warn(`No email for notification ${notificationId}`);
      return;
    }

    try {
      await this.email.send({
        to: user.email,
        subject: notification.title,
        html: notification.body,
      });

      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { status: 'SENT', sentAt: new Date() },
      });
    } catch (err) {
      this.logger.error(`Email send failed: ${(err as Error).message}`);
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { status: 'FAILED' },
      });
    }
  }
}
