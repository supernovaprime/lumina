import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';
import { IdempotencyService } from '../libs/idempotency/idempotency.service';
import { MoneyService } from '../libs/money/money.service';
import { TimeService } from '../libs/time/time.service';
import { canTransition } from './transitions';

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly idempotency: IdempotencyService,
    private readonly money: MoneyService,
    private readonly time: TimeService,
  ) {}

  async preview(
    userId: string,
    dto: { businessId: string; serviceId: string; vehicleId: string; date: string; startTime: string },
  ) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, customerId: userId },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, businessId: dto.businessId, isActive: true },
    });
    if (!service) throw new NotFoundException('Service not found');

    const modifiers = await this.prisma.priceModifier.findMany({
      where: {
        serviceId: dto.serviceId,
        vehicleType: vehicle.type,
        vehicleSize: vehicle.size,
      },
    });

    const multiplier = modifiers.length > 0 ? Number(modifiers[0].multiplier) : 1;
    const breakdown = this.money.resolvePrice(
      this.money.toCents(service.basePrice),
      multiplier,
    );

    return { ...breakdown, durationMinutes: service.durationMinutes };
  }

  async create(
    userId: string,
    dto: { businessId: string; serviceId: string; vehicleId: string; date: string; startTime: string; notes?: string },
    idempotencyKey: string,
  ) {
    const stored = await this.idempotency.check(idempotencyKey, userId);
    if (stored) return stored;

    const business = await this.prisma.business.findFirst({
      where: { id: dto.businessId, isVerified: true, isActive: true },
    });
    if (!business) throw new NotFoundException('Business not found or not verified');

    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, businessId: dto.businessId, isActive: true },
    });
    if (!service) throw new NotFoundException('Service not found');

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, customerId: userId },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    if (!this.time.isWithinWindow(dto.date, 30)) {
      throw new BadRequestException('Date must be within next 30 days');
    }

    const dateObj = new Date(dto.date + 'T00:00:00Z');

    const booking = await this.prisma.$transaction(async (tx) => {
      const slots = await tx.$queryRawUnsafe<any[]>(
        `SELECT * FROM "TimeSlot"
         WHERE "businessId" = $1 AND "date" = $2 AND "startTime" = $3
         FOR UPDATE`,
        dto.businessId, dateObj, dto.startTime,
      );

      if (!slots.length) throw new NotFoundException('Slot not found');
      const slot = slots[0];

      if (!slot.isAvailable || slot.currentBookings >= slot.maxBookings) {
        throw new ConflictException('SLOT_TAKEN');
      }

      const modifiers = await tx.priceModifier.findMany({
        where: {
          serviceId: dto.serviceId,
          vehicleType: vehicle.type,
          vehicleSize: vehicle.size,
        },
      });

      const multiplier = modifiers.length > 0 ? Number(modifiers[0].multiplier) : 1;
      const breakdown = this.money.resolvePrice(
        this.money.toCents(service.basePrice),
        multiplier,
      );

      const startTimeDate = this.time.toUTC(dto.date, dto.startTime, business.timezone);
      const endTimeDate = this.time.addMinutes(startTimeDate, service.durationMinutes);

      const b = await tx.booking.create({
        data: {
          customerId: userId,
          businessId: dto.businessId,
          serviceId: dto.serviceId,
          vehicleId: dto.vehicleId,
          timeSlotId: slot.id,
          date: dateObj,
          timeSlot: dto.startTime,
          totalPrice: this.money.toDecimal(breakdown.totalPriceCents),
          status: 'PENDING',
          notes: dto.notes,
        },
      });

      const newCount = slot.currentBookings + 1;
      await tx.timeSlot.update({
        where: { id: slot.id },
        data: {
          currentBookings: newCount,
          isAvailable: newCount < slot.maxBookings,
        },
      });

      return b;
    });

    const result = {
      bookingId: booking.id,
      status: booking.status,
      totalPriceCents: this.money.toCents(booking.totalPrice),
      date: dto.date,
      startTime: dto.startTime,
    };

    await this.idempotency.store(idempotencyKey, userId, result);
    await this.cache.invalidate(`slots:${dto.businessId}:*`);

    return result;
  }

  async cancel(userId: string, bookingId: string, reason?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.customerId !== userId) throw new NotFoundException('Booking not found');

    if (!canTransition(booking.status, 'CANCELLED')) {
      throw new BadRequestException(`Cannot cancel booking in ${booking.status} status`);
    }

    const timeSlot = await this.prisma.timeSlot.findUnique({
      where: { id: booking.timeSlotId },
    });

    if (timeSlot && !this.time.isFreeCancel(timeSlot.startTime as any)) {
      throw new BadRequestException('Cannot cancel less than 24 hours before start time');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledBy: userId,
          cancelReason: reason || 'CUSTOMER_CANCEL',
        },
      });

      if (timeSlot) {
        await tx.timeSlot.update({
          where: { id: booking.timeSlotId },
          data: {
            currentBookings: { decrement: 1 },
            isAvailable: true,
          },
        });
      }
    });

    await this.cache.invalidate(`slots:${booking.businessId}:*`);

    return { bookingId, status: 'CANCELLED' };
  }

  async findOne(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, customerId: userId },
      include: {
        business: { select: { id: true, name: true, address: true, city: true, phone: true } },
        service: { select: { id: true, name: true, durationMinutes: true } },
        vehicle: { select: { id: true, make: true, model: true, year: true, type: true, size: true } },
        timeSlot_rel: { select: { startTime: true, endTime: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async findAll(userId: string, filters: { status?: string; upcoming?: boolean; page?: number; limit?: number }) {
    const { status, upcoming, page = 1, limit = 20 } = filters;
    const where: any = { customerId: userId };
    if (status) where.status = status;
    if (upcoming) where.date = { gte: new Date() };

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          business: { select: { id: true, name: true, address: true } },
          service: { select: { id: true, name: true } },
          timeSlot_rel: { select: { startTime: true, endTime: true } },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { bookings, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
