# Admin Feature: Booking Management

## Brief Description

Booking Management gives admins full visibility and control over all bookings across the platform. Admins can view any booking, cancel bookings when disputes arise, and process refunds. This is the escalation point when customers or business owners can't resolve issues themselves.

**Endpoints:**
- `GET /api/v1/admin/bookings` — List all bookings (filterable)
- `GET /api/v1/admin/bookings/:id` — Get any booking detail
- `DELETE /api/v1/admin/bookings/:id` — Cancel a booking (admin override)
- `POST /api/v1/payments/:id/refund` — Process refund (shared with payment module)

**Auth:** ADMIN only  
**Cost:** $0

---

## 1. What This Feature Does

### 1.1 List All Bookings
Admin sends `GET /admin/bookings?date=2026-09-14&status=CONFIRMED&businessId=uuid&page=1`. Backend returns a paginated list of all bookings with customer, business, service, and vehicle info.

### 1.2 Get Booking Detail
Admin sends `GET /admin/bookings/:id`. Backend returns full booking detail including payment status, review (if any), and cancellation info.

### 1.3 Cancel Booking (Admin Override)
Admin sends `DELETE /admin/bookings/:id { reason }`. Unlike customer/business cancellation, admin override:
- Has NO time restriction (can cancel even after start time).
- Always triggers refund if payment was made.
- Releases the time slot.
- Notifies both parties.

### 1.4 Process Refund
Admin sends `POST /payments/:id/refund { amountCents?, reason }`. Processes full or partial refund via Stripe.

---

## 2. API Contracts

### 2.1 List All Bookings

```
GET /api/v1/admin/bookings?date=2026-09-14&status=CONFIRMED&businessId=uuid&page=1&limit=20
Authorization: Bearer <admin-jwt>
```

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `date` | string | — | Filter by date (YYYY-MM-DD) |
| `status` | string | — | Filter by status |
| `businessId` | uuid | — | Filter by business |
| `customerId` | uuid | — | Filter by customer |
| `from` | string | — | Start date range |
| `to` | string | — | End date range |
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Results per page |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "date": "2026-09-14",
      "timeSlot": "10:00 - 11:00",
      "status": "CONFIRMED",
      "totalPrice": 7500,
      "createdAt": "2026-09-12T14:30:00Z",
      "customer": {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      },
      "business": {
        "id": "uuid",
        "name": "Quick Wash Pro",
        "city": "Accra"
      },
      "service": {
        "id": "uuid",
        "name": "Full Detail",
        "category": "DETAILING"
      },
      "vehicle": {
        "make": "Toyota",
        "model": "Camry",
        "year": 2022,
        "type": "SEDAN"
      },
      "payment": {
        "status": "COMPLETED",
        "method": "CARD"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

### 2.2 Get Booking Detail

```
GET /api/v1/admin/bookings/:id
Authorization: Bearer <admin-jwt>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "date": "2026-09-14",
    "timeSlot": "10:00 - 11:00",
    "status": "CONFIRMED",
    "totalPrice": 7500,
    "notes": "Please use eco-friendly soap",
    "createdAt": "2026-09-12T14:30:00Z",
    "updatedAt": "2026-09-12T14:30:00Z",
    "cancelledAt": null,
    "cancelledBy": null,
    "cancelReason": null,
    "customer": {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+1234567890"
    },
    "business": {
      "id": "uuid",
      "name": "Quick Wash Pro",
      "phone": "+233201234567",
      "email": "info@quickwash.com"
    },
    "service": {
      "id": "uuid",
      "name": "Full Detail",
      "category": "DETAILING",
      "durationMinutes": 60
    },
    "vehicle": {
      "id": "uuid",
      "make": "Toyota",
      "model": "Camry",
      "year": 2022,
      "color": "White",
      "licensePlate": "GR-1234-22",
      "type": "SEDAN",
      "size": "MEDIUM"
    },
    "payment": {
      "id": "uuid",
      "amount": 7500,
      "currency": "USD",
      "status": "COMPLETED",
      "method": "CARD",
      "transactionId": "pi_abc123"
    },
    "review": null
  }
}
```

### 2.3 Cancel Booking (Admin Override)

```
DELETE /api/v1/admin/bookings/:id
Authorization: Bearer <admin-jwt>
```

**Request Body:**

```json
{
  "reason": "Customer dispute resolved in favor of customer"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "CANCELLED",
    "cancelledAt": "2026-09-14T15:00:00Z",
    "cancelledBy": "ADMIN",
    "refundInitiated": true,
    "message": "Booking cancelled successfully"
  }
}
```

---

## 3. Data Model

No new tables. Reads/writes to existing tables:

| Table | Operation |
|-------|-----------|
| `Booking` | Read, update `status`, `cancelledAt`, `cancelledBy`, `cancelReason` |
| `Customer` | Read (owner info) |
| `Business` | Read (business info) |
| `Service` | Read (service info) |
| `Vehicle` | Read (vehicle info) |
| `Payment` | Read + update (on refund) |
| `TimeSlot` | Update `currentBookings--` (release slot) |
| `AuditLog` | Insert (on cancel/refund) |

---

## 4. Implementation Files

### 4.1 DTOs

**`admin/dto/list-bookings.dto.ts`**

```typescript
import { IsOptional, IsIn, IsString, IsInt, Min, Max, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class ListBookingsDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @IsOptional()
  @IsIn(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REFUNDED'])
  status?: string;

  @IsOptional()
  @IsString()
  businessId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
```

**`admin/dto/cancel-booking.dto.ts`**

```typescript
import { IsString, MaxLength } from 'class-validator';

export class CancelBookingDto {
  @IsString()
  @MaxLength(500)
  reason: string;
}
```

### 4.2 Controller

```typescript
import { Controller, Get, Delete, Param, Query, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../libs/common/guards/jwt-auth.guard';
import { RolesGuard } from '../libs/common/guards/roles.guard';
import { Roles } from '../libs/common/decorators/roles.decorator';
import { CurrentUser } from '../libs/common/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import { ListBookingsDto } from './dto/list-bookings.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('bookings')
  async listBookings(@Query() query: ListBookingsDto) {
    return this.adminService.listBookings(query);
  }

  @Get('bookings/:id')
  async getBooking(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getBookingDetail(id);
  }

  @Delete('bookings/:id')
  async cancelBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CancelBookingDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.cancelBooking(id, body.reason, adminId);
  }
}
```

### 4.3 Service

```typescript
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { AuditService } from '../libs/audit/audit.service';
import { EmailService } from '../libs/email/email.service';
import { CacheService } from '../libs/cache/cache.service';
import { ListBookingsDto } from './dto/list-bookings.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
    private readonly cache: CacheService,
  ) {}

  async listBookings(dto: ListBookingsDto) {
    const { date, status, businessId, customerId, from, to, page, limit } = dto;

    const where: any = {};
    if (date) {
      where.date = new Date(date);
    }
    if (status) where.status = status;
    if (businessId) where.businessId = businessId;
    if (customerId) where.customerId = customerId;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          customer: { include: { user: { select: { email: true } } } },
          business: { select: { id: true, name: true, city: true } },
          service: { select: { id: true, name: true, category: true } },
          vehicle: { select: { make: true, model: true, year: true, type: true } },
          payment: { select: { status: true, method: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data: bookings.map((b) => ({
        id: b.id,
        date: b.date,
        timeSlot: b.timeSlot,
        status: b.status,
        totalPrice: b.totalPrice,
        createdAt: b.createdAt,
        customer: {
          id: b.customerId,
          firstName: b.customer.firstName,
          lastName: b.customer.lastName,
          email: b.customer.user.email,
        },
        business: b.business,
        service: b.service,
        vehicle: b.vehicle,
        payment: b.payment,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getBookingDetail(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        customer: {
          include: {
            user: { select: { email: true } },
          },
        },
        business: { select: { id: true, name: true, phone: true, email: true } },
        service: { select: { id: true, name: true, category: true, durationMinutes: true } },
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
      include: { payment: true, timeSlot_rel: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status === 'CANCELLED') throw new ConflictException('Booking is already cancelled');
    if (booking.status === 'REFUNDED') throw new ConflictException('Booking is already refunded');

    // Admin can cancel any booking (no time restriction)
    let refundInitiated = false;

    await this.prisma.$transaction(async (tx) => {
      // 1. Update booking status
      await tx.booking.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledBy: 'ADMIN',
          cancelReason: reason,
        },
      });

      // 2. Release time slot
      await tx.timeSlot.update({
        where: { id: booking.timeSlotId },
        data: {
          currentBookings: { decrement: 1 },
        },
      });

      // 3. If payment was completed, initiate refund
      if (booking.payment && booking.payment.status === 'COMPLETED') {
        await tx.payment.update({
          where: { id: booking.paymentId },
          data: { status: 'REFUNDED' },
        });
        refundInitiated = true;
        // Actual Stripe refund call happens async via queue
      }

      // 4. Audit log
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'BOOKING_CANCELLED_BY_ADMIN',
          entityType: 'BOOKING',
          entityId: id,
          metadata: { reason, refundInitiated },
        },
      });
    });

    // 5. Invalidate slot cache
    await this.cache.invalidate(`slots:${booking.businessId}:${booking.date}`);

    // 6. Send notifications (async)
    await Promise.all([
      this.email.send({
        to: booking.customer.user.email,
        template: 'booking-cancelled',
        data: { bookingId: id, reason, cancelledBy: 'admin' },
      }),
      this.email.send({
        to: booking.business.email,
        template: 'booking-cancelled',
        data: { bookingId: id, reason, cancelledBy: 'admin' },
      }),
    ]);

    return {
      data: {
        id,
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: 'ADMIN',
        refundInitiated,
        message: 'Booking cancelled successfully',
      },
    };
  }
}
```

### 4.4 Module

```typescript
import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../libs/prisma/prisma.module';
import { CacheModule } from '../libs/cache/cache.module';
import { AuditModule } from '../libs/audit/audit.module';
import { EmailModule } from '../libs/email/email.module';

@Module({
  imports: [PrismaModule, CacheModule, AuditModule, EmailModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
```

---

## 5. Admin vs Customer/Business Cancellation

| Aspect | Customer/Business | Admin |
|--------|-------------------|-------|
| Time restriction | 24h before start | None — can cancel anytime |
| Refund | Policy-gated (may forfeit deposit) | Always initiates refund if paid |
| Approval needed | No (self-service) | No (admin override) |
| Audit logged | Yes | Yes (with reason) |
| Slot released | Yes | Yes |
| Both parties notified | Yes | Yes |

---

## 6. Refund Flow

```
Admin clicks "Cancel & Refund"
         │
         ▼
DELETE /admin/bookings/:id { reason }
         │
         ▼
┌─────────────────────────────┐
│  1. Booking.status = CANCELLED  │
│  2. TimeSlot.currentBookings--  │
│  3. Payment.status = REFUNDED   │
│  4. AuditLog.create             │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Enqueue refund job:            │
│  - Stripe refunds.create()     │
│  - Email to customer           │
│  - Email to business           │
└─────────────────────────────┘
```

---

## 7. Testing

### Unit Tests

```typescript
describe('AdminService', () => {
  describe('cancelBooking', () => {
    it('should cancel a CONFIRMED booking and initiate refund', async () => { ... });
    it('should cancel a PENDING booking without refund', async () => { ... });
    it('should release the time slot', async () => { ... });
    it('should throw NotFoundException for non-existent booking', async () => { ... });
    it('should throw ConflictException if already cancelled', async () => { ... });
  });
});
```

### E2E Tests

```typescript
describe('Admin Booking Management (e2e)', () => {
  it('GET /admin/bookings lists all bookings', () => { ... });
  it('GET /admin/bookings?status=CONFIRMED filters correctly', () => { ... });
  it('GET /admin/bookings/:id returns full detail', () => { ... });
  it('DELETE /admin/bookings/:id cancels and refunds', () => { ... });
  it('returns 403 for non-admin users', () => { ... });
});
```

---

## 8. File Summary

| File | Path | Purpose |
|------|------|---------|
| Controller | `src/admin/admin.controller.ts` | Route handlers for booking mgmt |
| Service | `src/admin/admin.service.ts` | Business logic, DB queries |
| Module | `src/admin/admin.module.ts` | NestJS module wiring |
| DTO (list) | `src/admin/dto/list-bookings.dto.ts` | Query param validation |
| DTO (cancel) | `src/admin/dto/cancel-booking.dto.ts` | Cancel body validation |
| Unit Test | `test/unit/admin.service.spec.ts` | Service logic tests |
| E2E Test | `test/e2e/admin.e2e-spec.ts` | Full HTTP tests |

**Total files: 7** (no new DB models)
