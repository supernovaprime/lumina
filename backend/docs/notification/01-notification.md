# Notification Module Scaffold

## Purpose
Async notification dispatch. Writes `Notification` record + sends via email/SMS.
Templates for each trigger type. No sending in request cycle — enqueue for worker.
For MVP: synchronous send in service (no BullMQ worker), will migrate to async later.

## Files to create:
- `src/notification/notification.module.ts`
- `src/notification/notification.service.ts`
- `src/notification/templates/index.ts`
- `src/notification/notification.service.spec.ts`

---

## `src/notification/notification.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { EmailService } from '../libs/email/email.service';

export type NotificationType =
  | 'booking-created'
  | 'payment-succeeded'
  | 'booking-confirmed'
  | 'booking-cancelled'
  | 'reminder-24h'
  | 'reminder-2h'
  | 'review-request'
  | 'business-approved'
  | 'refund-processed';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  /**
   * Enqueue a notification for sending.
   * Creates DB record + sends immediately (MVP: sync).
   */
  async enqueue(
    type: NotificationType,
    userId: string,
    data: Record<string, any>,
    channel: 'EMAIL' | 'SMS' | 'IN_APP' = 'EMAIL',
  ): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      this.logger.warn(`Notification target user ${userId} not found`);
      return '';
    }

    const template = this.getTemplate(type, data);
    if (!template) {
      this.logger.warn(`No template for notification type: ${type}`);
      return '';
    }

    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title: template.title,
        body: template.body,
        data: JSON.stringify(data),
        channel,
        status: 'PENDING',
      },
    });

    // MVP: send immediately (will be async with BullMQ later)
    try {
      if (channel === 'EMAIL' && user.email) {
        await this.email.send({
          to: user.email,
          subject: template.subject,
          html: template.body,
        });
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { status: 'SENT', sentAt: new Date() },
        });
      }
    } catch (err) {
      this.logger.error(`Failed to send notification ${notification.id}: ${err.message}`);
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'FAILED' },
      });
    }

    return notification.id;
  }

  /**
   * Send booking-created notification to both customer and business.
   */
  async notifyBookingCreated(bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: { include: { user: true } },
        business: { include: { owner: true } },
        service: true,
      },
    });
    if (!booking) return;

    // Notify customer
    await this.enqueue('booking-created', booking.customer.userId, {
      bookingId,
      businessName: booking.business.name,
      serviceName: booking.service.name,
      date: booking.date,
      startTime: booking.startTime,
    });

    // Notify business owner
    await this.enqueue('booking-created', booking.business.ownerId, {
      bookingId,
      customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
      serviceName: booking.service.name,
      date: booking.date,
      startTime: booking.startTime,
    });
  }

  /**
   * Send booking-cancelled notification to both parties.
   */
  async notifyBookingCancelled(bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: { include: { user: true } },
        business: { include: { owner: true } },
        service: true,
      },
    });
    if (!booking) return;

    await this.enqueue('booking-cancelled', booking.customer.userId, {
      bookingId,
      businessName: booking.business.name,
      serviceName: booking.service.name,
      cancelReason: booking.cancelReason,
    });

    await this.enqueue('booking-cancelled', booking.business.ownerId, {
      bookingId,
      customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
      cancelReason: booking.cancelReason,
    });
  }

  /**
   * Send payment-succeeded notification to customer.
   */
  async notifyPaymentSucceeded(bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: { include: { user: true } },
        business: true,
        service: true,
      },
    });
    if (!booking) return;

    await this.enqueue('payment-succeeded', booking.customer.userId, {
      bookingId,
      businessName: booking.business.name,
      serviceName: booking.service.name,
      amount: booking.totalPriceCents,
      currency: booking.currency,
    });
  }

  /**
   * Send review request 24h after completion.
   */
  async notifyReviewRequest(bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: { include: { user: true } },
        business: true,
        service: true,
      },
    });
    if (!booking) return;

    await this.enqueue('review-request', booking.customer.userId, {
      bookingId,
      businessName: booking.business.name,
      serviceName: booking.service.name,
    });
  }

  private getTemplate(type: NotificationType, data: Record<string, any>) {
    const templates: Record<NotificationType, (data: Record<string, any>) => { subject: string; title: string; body: string }> = {
      'booking-created': (d) => ({
        subject: `Booking Confirmed - ${d.businessName}`,
        title: 'Booking Created',
        body: `Your booking at ${d.businessName} for ${d.serviceName} on ${d.date} at ${d.startTime} has been created.`,
      }),
      'payment-succeeded': (d) => ({
        subject: `Payment Received - ${d.businessName}`,
        title: 'Payment Successful',
        body: `Your payment of ${(d.amount / 100).toFixed(2)} ${d.currency} for ${d.serviceName} at ${d.businessName} was successful.`,
      }),
      'booking-confirmed': (d) => ({
        subject: `Booking Confirmed - ${d.businessName}`,
        title: 'Booking Confirmed',
        body: `Your booking at ${d.businessName} for ${d.serviceName} has been confirmed.`,
      }),
      'booking-cancelled': (d) => ({
        subject: `Booking Cancelled`,
        title: 'Booking Cancelled',
        body: `Your booking at ${d.businessName} has been cancelled. Reason: ${d.cancelReason || 'Not specified'}`,
      }),
      'reminder-24h': (d) => ({
        subject: `Reminder: Booking tomorrow at ${d.businessName}`,
        title: 'Booking Reminder',
        body: `Reminder: You have a booking at ${d.businessName} for ${d.serviceName} tomorrow at ${d.startTime}.`,
      }),
      'reminder-2h': (d) => ({
        subject: `Reminder: Booking in 2 hours`,
        title: 'Booking Reminder',
        body: `Reminder: You have a booking at ${d.businessName} in 2 hours.`,
      }),
      'review-request': (d) => ({
        subject: `How was your experience at ${d.businessName}?`,
        title: 'Leave a Review',
        body: `How was your ${d.serviceName} at ${d.businessName}? Leave a review to help others.`,
      }),
      'business-approved': (d) => ({
        subject: `Your business has been approved!`,
        title: 'Business Approved',
        body: `Congratulations! Your business "${d.businessName}" has been approved and is now visible to customers.`,
      }),
      'refund-processed': (d) => ({
        subject: `Refund Processed`,
        title: 'Refund Processed',
        body: `Your refund of ${(d.amount / 100).toFixed(2)} ${d.currency} has been processed.`,
      }),
    };

    return templates[type]?.(data);
  }
}
```

---

## `src/notification/notification.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { PrismaModule } from '../libs/prisma/prisma.module';
import { EmailModule } from '../libs/email/email.module';

@Module({
  imports: [PrismaModule, EmailModule],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
```

---

## `src/notification/notification.service.spec.ts`

Tests:
1. enqueue creates notification record in DB
2. enqueue sends email and marks SENT
3. enqueue marks FAILED on email error
4. enqueue returns empty string for missing user
5. notifyBookingCreated sends to both customer and business owner
6. notifyBookingCancelled sends to both parties
7. notifyPaymentSucceeded sends to customer
8. getTemplate returns correct template for each type
9. templates produce correct subject/body
