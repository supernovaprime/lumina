import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';
import { AuditService } from '../libs/audit/audit.service';
import { EmailService } from '../libs/email/email.service';
import { ListBookingsDto } from './dto/list-bookings.dto';

@Injectable()
export class AdminBookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
  ) {}

  async listBookings(dto: ListBookingsDto) {
    const { date, status, businessId, customerId, from, to, page = 1, limit = 20 } = dto;

    const where: any = {};
    if (date) where.date = new Date(date);
    if (status) where.status = status;
    if (businessId) where.businessId = businessId;
    if (customerId) where.customerId = customerId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          customer: { select: { firstName: true, lastName: true, phone: true } },
          business: { select: { name: true, city: true } },
          service: { select: { name: true, basePrice: true } },
          vehicle: { select: { make: true, model: true, licensePlate: true } },
          payment: { select: { status: true, amount: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data: bookings,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getBookingDetail(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        customer: { include: { user: { select: { email: true } } } },
        business: { select: { name: true, city: true, owner: { select: { email: true } } } },
        service: true,
        vehicle: true,
        payment: true,
        review: true,
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    return { data: booking };
  }

  async cancelBooking(id: string, reason: string, adminId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { payment: true, business: { select: { name: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const cancelled = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledBy: adminId,
          cancelReason: reason,
        },
      });

      await tx.timeSlot.update({
        where: { id: booking.timeSlotId },
        data: { currentBookings: { decrement: 1 } },
      });

      if (booking.payment && booking.payment.status === 'COMPLETED') {
        await tx.payment.update({
          where: { bookingId: id },
          data: { status: 'REFUNDED' },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'BOOKING_CANCELLED_ADMIN',
          entityType: 'BOOKING',
          entityId: id,
          metadata: { reason },
        },
      });

      return updated;
    });

    await this.cache.invalidate(`slots:${booking.businessId}:*`);

    return { data: { id: cancelled.id, status: cancelled.status, message: 'Booking cancelled' } };
  }
}
