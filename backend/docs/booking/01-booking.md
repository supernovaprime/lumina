# Booking Module Scaffold

## Purpose
Customer-facing booking lifecycle: preview price, create booking (idempotent with row lock), cancel (policy-gated), list/detail.

## Files to create:
- `src/booking/booking.module.ts`
- `src/booking/booking.controller.ts`
- `src/booking/booking.service.ts`
- `src/booking/transitions.ts`
- `src/booking/dto/preview-booking.dto.ts`
- `src/booking/dto/create-booking.dto.ts`
- `src/booking/dto/cancel-booking.dto.ts`
- `src/booking/booking.service.spec.ts`
- `src/booking/transitions.spec.ts`

---

## `src/booking/transitions.ts` — State machine

```typescript
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';

export const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
```

---

## `src/booking/dto/preview-booking.dto.ts`

```typescript
import { IsString, IsNotEmpty, IsDateString } from 'class-validator';

export class PreviewBookingDto {
  @IsString() @IsNotEmpty() businessId: string;
  @IsString() @IsNotEmpty() serviceId: string;
  @IsString() @IsNotEmpty() vehicleId: string;
  @IsDateString() date: string;
  @IsString() @IsNotEmpty() startTime: string;
}
```

---

## `src/booking/dto/create-booking.dto.ts`

```typescript
import { IsString, IsNotEmpty, IsDateString, IsOptional } from 'class-validator';

export class CreateBookingDto {
  @IsString() @IsNotEmpty() businessId: string;
  @IsString() @IsNotEmpty() serviceId: string;
  @IsString() @IsNotEmpty() vehicleId: string;
  @IsDateString() date: string;
  @IsString() @IsNotEmpty() startTime: string;
  @IsString() @IsOptional() notes?: string;
}
```

---

## `src/booking/dto/cancel-booking.dto.ts`

```typescript
import { IsString, IsOptional } from 'class-validator';

export class CancelBookingDto {
  @IsString() @IsOptional() reason?: string;
}
```

---

## `src/booking/booking.service.ts` — Core booking logic

```typescript
import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';
import { IdempotencyService } from '../libs/idempotency/idempotency.service';
import { MoneyService, PriceBreakdown } from '../libs/money/money.service';
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

  /**
   * Preview price without side effects (§6.1).
   */
  async preview(
    userId: string,
    dto: { businessId: string; serviceId: string; vehicleId: string; date: string; startTime: string },
  ): Promise<PriceBreakdown & { durationMinutes: number }> {
    // Validate ownership
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, customerId: userId },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, businessId: dto.businessId, isActive: true },
    });
    if (!service) throw new NotFoundException('Service not found');

    // Get price modifiers for vehicle type/size
    const modifiers = await this.prisma.priceModifier.findMany({
      where: {
        serviceId: dto.serviceId,
        OR: [
          { vehicleType: vehicle.type },
          { vehicleSize: vehicle.size },
        ],
      },
    });

    const breakdown = this.money.resolvePrice(
      Number(service.basePriceCents),
      modifiers.map((m) => ({
        multiplier: m.multiplier ? Number(m.multiplier) : undefined,
        fixedDeltaCents: m.fixedDeltaCents,
      })),
    );

    return { ...breakdown, durationMinutes: service.durationMinutes };
  }

  /**
   * Create booking with idempotency + row lock (§6.2).
   * Transactional: idempotency → validate → FOR UPDATE lock → price → create → increment → cache invalidate.
   */
  async create(
    userId: string,
    dto: { businessId: string; serviceId: string; vehicleId: string; date: string; startTime: string; notes?: string },
    idempotencyKey: string,
  ): Promise<{ bookingId: string; status: string; totalPriceCents: number; date: string; startTime: string; endTime: string }> {
    // 1. Idempotency check
    const stored = await this.idempotency.check(idempotencyKey, userId);
    if (stored) return stored;

    // 2. Validate business + service + vehicle
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

    // Validate date is within window
    if (!this.time.isWithinWindow(dto.date, 30)) {
      throw new BadRequestException('Date must be within next 30 days');
    }

    // 3. Lock slot row (SELECT ... FOR UPDATE)
    const dateObj = new Date(dto.date + 'T00:00:00Z');
    const slot = await this.prisma.$transaction(async (tx) => {
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

      // 4. Resolve price server-side
      const modifiers = await tx.priceModifier.findMany({
        where: {
          serviceId: dto.serviceId,
          OR: [
            { vehicleType: vehicle.type },
            { vehicleSize: vehicle.size },
          ],
        },
      });

      const breakdown = this.money.resolvePrice(
        Number(service.basePriceCents),
        modifiers.map((m) => ({
          multiplier: m.multiplier ? Number(m.multiplier) : undefined,
          fixedDeltaCents: m.fixedDeltaCents,
        })),
      );

      // 5. Create booking
      const startTimeDate = this.time.toUTC(dto.date, dto.startTime, business.timezone);
      const endTimeDate = this.time.addMinutes(startTimeDate, service.durationMinutes);

      const booking = await tx.booking.create({
        data: {
          customerId: userId,
          businessId: dto.businessId,
          serviceId: dto.serviceId,
          vehicleId: dto.vehicleId,
          timeSlotId: slot.id,
          date: dateObj,
          startTime: startTimeDate,
          endTime: endTimeDate,
          totalPriceCents: breakdown.totalPriceCents,
          currency: breakdown.currency,
          status: 'PENDING',
          notes: dto.notes,
        },
      });

      // 6. Increment slot bookings
      const newCount = slot.currentBookings + 1;
      await tx.timeSlot.update({
        where: { id: slot.id },
        data: {
          currentBookings: newCount,
          isAvailable: newCount < slot.maxBookings,
        },
      });

      return booking;
    });

    // 7. Store idempotency result
    const result = {
      bookingId: slot.id,
      status: 'PENDING',
      totalPriceCents: slot.totalPriceCents,
      date: dto.date,
      startTime: dto.startTime,
      endTime: this.time.formatISO(slot.endTime),
    };

    await this.idempotency.store(idempotencyKey, userId, result);

    // 8. Invalidate slot cache
    await this.cache.invalidate(`slots:${dto.businessId}:*`);

    return result;
  }

  /**
   * Cancel booking with policy check (§6.5).
   */
  async cancel(
    userId: string,
    bookingId: string,
    reason?: string,
  ): Promise<{ bookingId: string; status: string }> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { timeSlot: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.customerId !== userId) throw new NotFoundException('Booking not found');

    if (!canTransition(booking.status, 'CANCELLED')) {
      throw new BadRequestException(`Cannot cancel booking in ${booking.status} status`);
    }

    // Policy check: free cancel if >=24h before start
    if (!this.time.isFreeCancel(booking.startTime)) {
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

      // Decrement slot bookings
      await tx.timeSlot.update({
        where: { id: booking.timeSlotId },
        data: {
          currentBookings: { decrement: 1 },
          isAvailable: true,
        },
      });
    });

    await this.cache.invalidate(`slots:${booking.businessId}:*`);

    return { bookingId, status: 'CANCELLED' };
  }

  /**
   * Get booking detail (own only).
   */
  async findOne(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, customerId: userId },
      include: {
        business: { select: { id: true, name: true, address: true, city: true, phone: true } },
        service: { select: { id: true, name: true, durationMinutes: true } },
        vehicle: { select: { id: true, make: true, model: true, year: true, type: true, size: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  /**
   * List customer's bookings with filters.
   */
  async findAll(
    userId: string,
    filters: { status?: string; upcoming?: boolean; page?: number; limit?: number },
  ) {
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
```

---

## `src/booking/booking.controller.ts`

```typescript
import { Controller, Get, Post, Delete, Body, Param, Query, Headers, UseGuards, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from '../libs/common/guards/jwt-auth.guard';
import { RolesGuard } from '../libs/common/guards/roles.guard';
import { Roles } from '../libs/common/decorators/roles.decorator';
import { CurrentUser } from '../libs/common/decorators/current-user.decorator';
import { BookingService } from './booking.service';
import { PreviewBookingDto } from './dto/preview-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';

@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post('preview')
  @Roles('CUSTOMER')
  preview(@CurrentUser() user: any, @Body() dto: PreviewBookingDto) {
    return this.bookingService.preview(user.userId, dto);
  }

  @Post()
  @Roles('CUSTOMER')
  @HttpCode(201)
  create(
    @CurrentUser() user: any,
    @Body() dto: CreateBookingDto,
    @Headers('x-idempotency-key') idempotencyKey: string,
  ) {
    return this.bookingService.create(user.userId, dto, idempotencyKey);
  }

  @Get(':id')
  @Roles('CUSTOMER')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.bookingService.findOne(user.userId, id);
  }

  @Delete(':id')
  @Roles('CUSTOMER')
  cancel(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: CancelBookingDto) {
    return this.bookingService.cancel(user.userId, id, dto.reason);
  }

  @Get()
  @Roles('CUSTOMER')
  findAll(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('upcoming') upcoming?: string,
    @Query('page') page?: string,
  ) {
    return this.bookingService.findAll(user.userId, {
      status,
      upcoming: upcoming === 'true',
      page: page ? parseInt(page) : 1,
    });
  }
}
```

---

## `src/booking/booking.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { PrismaModule } from '../libs/prisma/prisma.module';
import { CacheModule } from '../libs/cache/cache.module';
import { IdempotencyModule } from '../libs/idempotency/idempotency.module';
import { MoneyModule } from '../libs/money/money.module';
import { TimeModule } from '../libs/time/time.module';

@Module({
  imports: [PrismaModule, CacheModule, IdempotencyModule, MoneyModule, TimeModule],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
```

---

## `src/booking/booking.service.spec.ts`

Tests:
1. preview returns correct price breakdown
2. preview throws NotFoundException for invalid vehicle
3. preview throws NotFoundException for invalid service
4. create stores idempotency result and returns booking
5. create returns stored response on duplicate key
6. create throws ConflictException when slot is full
7. create throws NotFoundException for unverified business
8. cancel returns CANCELLED status
9. cancel throws BadRequestException for <24h cancellation
10. cancel throws BadRequestException for non-CANCELLED transition
11. findOne returns booking with relations
12. findOne throws NotFoundException for non-owned booking
13. findAll returns paginated results

## `src/booking/transitions.spec.ts`

Tests:
1. canTransition PENDING→CONFIRMED is valid
2. canTransition PENDING→CANCELLED is valid
3. canTransition PENDING→COMPLETED is invalid
4. canTransition CONFIRMED→IN_PROGRESS is valid
5. canTransition IN_PROGRESS→COMPLETED is valid
6. canTransition COMPLETED→REFUNDED is valid
7. canTransition CANCELLED→anything is invalid
8. canTransition COMPLETED→CANCELLED is invalid
