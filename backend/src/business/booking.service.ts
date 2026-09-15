import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  REFUNDED: [],
};

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async listByBusiness(businessId: string, filters: { date?: string; status?: string; page: number }) {
    const where: any = { businessId };
    if (filters.date) where.date = new Date(filters.date);
    if (filters.status) where.status = filters.status;

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          customer: { select: { firstName: true, lastName: true, phone: true } },
          vehicle: { select: { make: true, model: true, year: true, licensePlate: true } },
          service: { select: { name: true, basePrice: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * 20,
        take: 20,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      bookings,
      pagination: { page: filters.page, limit: 20, total },
    };
  }

  async findById(businessId: string, bookingId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, businessId },
      include: {
        customer: true,
        vehicle: true,
        service: true,
        payment: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async updateStatus(businessId: string, bookingId: string, action: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, businessId },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const allowed = VALID_TRANSITIONS[booking.status];
    if (!allowed || !allowed.includes(action)) {
      throw new BadRequestException({
        code: 'INVALID_TRANSITION',
        message: `Cannot ${action.toLowerCase()} a booking that is ${booking.status.toLowerCase()}`,
      });
    }

    const updateData: any = { status: action };

    if (action === 'CANCELLED') {
      updateData.cancelledAt = new Date();
      updateData.cancelledBy = businessId;
      updateData.cancelReason = 'NO_SHOW';

      await this.prisma.timeSlot.update({
        where: { id: booking.timeSlotId },
        data: { currentBookings: { decrement: 1 } },
      });
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: updateData,
    });

    await this.cache.invalidate(`slots:${businessId}:*`);

    return updated;
  }
}
