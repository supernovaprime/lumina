import { Injectable } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { ListCustomerBookingsDto } from './dto/list-customer-bookings.dto';

@Injectable()
export class BookingHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(customerId: string, dto: ListCustomerBookingsDto) {
    const { status, upcoming, page = 1, limit = 20 } = dto;

    const where: any = { customerId };
    if (status) where.status = status;
    if (upcoming === 'true') where.date = { gte: new Date() };
    if (upcoming === 'false') where.date = { lt: new Date() };

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          business: { select: { id: true, name: true, city: true, logo: true } },
          service: { select: { id: true, name: true, category: true } },
          vehicle: { select: { id: true, make: true, model: true, year: true, licensePlate: true } },
        },
        orderBy: { date: upcoming === 'false' ? 'desc' : 'asc' },
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
}
