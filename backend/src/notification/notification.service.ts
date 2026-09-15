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
        data: data as any,
        channel,
        status: 'PENDING',
      },
    });

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
    } catch (err: any) {
      this.logger.error(`Failed to send notification ${notification.id}: ${err.message}`);
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'FAILED' },
      });
    }

    return notification.id;
  }

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

    await this.enqueue('booking-created', booking.customer.userId, {
      bookingId,
      businessName: booking.business.name,
      serviceName: booking.service.name,
      date: booking.date,
      startTime: booking.timeSlot,
    });

    await this.enqueue('booking-created', booking.business.ownerId, {
      bookingId,
      customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
      serviceName: booking.service.name,
      date: booking.date,
      startTime: booking.timeSlot,
    });
  }

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
      cancelReason: booking.cancelReason,
    });

    await this.enqueue('booking-cancelled', booking.business.ownerId, {
      bookingId,
      customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
      cancelReason: booking.cancelReason,
    });
  }

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
      amount: booking.totalPrice,
      currency: 'USD',
    });
  }

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
    const templates: Record<NotificationType, (d: Record<string, any>) => { subject: string; title: string; body: string }> = {
      'booking-created': (d) => ({
        subject: `Booking Confirmed - ${d.businessName}`,
        title: 'Booking Created',
        body: `Your booking at ${d.businessName} for ${d.serviceName} on ${d.date} at ${d.startTime} has been created.`,
      }),
      'payment-succeeded': (d) => ({
        subject: `Payment Received - ${d.businessName}`,
        title: 'Payment Successful',
        body: `Your payment of $${(Number(d.amount) || 0).toFixed(2)} ${d.currency} for ${d.serviceName} at ${d.businessName} was successful.`,
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
        body: `Your refund has been processed.`,
      }),
    };

    return templates[type]?.(data);
  }
}
