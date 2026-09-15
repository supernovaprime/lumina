# Business Feature: Booking Lifecycle Management

## Brief Description

Business owners manage their bookings — view calendar, confirm bookings, start/complete services, mark no-shows. The booking status follows a strict state machine: `PENDING → CONFIRMED → IN_PROGRESS → COMPLETED` with `CANCELLED` and `REFUNDED` as terminal states.

**Endpoints:**
- `GET /api/v1/businesses/:id/bookings?date=&status=` — List bookings (owner)
- `GET /api/v1/businesses/:id/bookings/:bookingId` — Booking detail (owner)
- `PATCH /api/v1/businesses/:id/bookings/:bookingId` — Status transition (owner)

**Auth:** BUSINESS role (owner only)
**Cost:** $0

---

## 1. What This Feature Does

1. Business owner sees all bookings for their business, filterable by date and status.
2. For pay-at-location bookings, the owner confirms the booking.
3. Owner marks service as started when customer arrives.
4. Owner marks service as completed when done.
5. Owner can mark a customer as no-show.
6. Status transitions are validated — invalid transitions return errors.

---

## 2. State Machine

```
PENDING → CONFIRMED → IN_PROGRESS → COMPLETED
   ↓          ↓
CANCELLED  CANCELLED (no-show)
```

| From | To | Trigger |
|------|----|---------|
| `PENDING` | `CONFIRMED` | Payment succeeded / business confirms |
| `CONFIRMED` | `IN_PROGRESS` | Business starts service |
| `IN_PROGRESS` | `COMPLETED` | Business completes service |
| `CONFIRMED` | `CANCELLED` | No-show (business marks) |
| `PENDING` | `CANCELLED` | Customer cancels / admin cancels |

---

## 3. API Contract

### List Bookings

```
GET /api/v1/businesses/:id/bookings?date=2026-09-14&status=CONFIRMED
Authorization: Bearer <business-jwt>
```

**Query params:**
- `date` (optional) — Filter by date (YYYY-MM-DD)
- `status` (optional) — Filter by status
- `page` (optional) — Page number (default: 1)

**Response:**
```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": "bk-1",
        "customerId": "cust-1",
        "customer": {
          "firstName": "John",
          "lastName": "Doe",
          "phone": "+15125551234"
        },
        "vehicle": {
          "make": "Toyota",
          "model": "Camry",
          "year": 2024,
          "licensePlate": "ABC-1234"
        },
        "service": {
          "name": "Basic Wash",
          "basePrice": 2500
        },
        "date": "2026-09-14",
        "timeSlot": "10:00 - 10:30",
        "status": "CONFIRMED",
        "totalPrice": 2500,
        "notes": "Please use eco-friendly soap",
        "createdAt": "2026-09-13T14:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1
    }
  }
}
```

### Get Booking Detail

```
GET /api/v1/businesses/:id/bookings/:bookingId
Authorization: Bearer <business-jwt>
```

**Response:** Full booking object with customer, vehicle, service, payment info.

### Update Booking Status

```
PATCH /api/v1/businesses/:id/bookings/:bookingId
Authorization: Bearer <business-jwt>
```

**Request body:**
```json
{
  "action": "START"
}
```

**Actions:** `CONFIRM`, `START`, `COMPLETE`, `NO_SHOW`

**Response — Success:**
```json
{
  "success": true,
  "data": {
    "id": "bk-1",
    "status": "IN_PROGRESS",
    "updatedAt": "2026-09-14T10:00:00Z"
  }
}
```

**Response — Invalid Transition:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_TRANSITION",
    "message": "Cannot start a booking that is not confirmed"
  }
}
```

---

## 4. Data Model

No new tables — uses existing `Booking` table with columns:

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `customerId` | UUID | FK → Customer |
| `businessId` | UUID | FK → Business |
| `serviceId` | UUID | FK → Service |
| `vehicleId` | UUID | FK → Vehicle |
| `timeSlotId` | UUID | FK → TimeSlot |
| `date` | Date | Booking date |
| `timeSlot` | String | "HH:MM - HH:MM" |
| `status` | Enum | PENDING / CONFIRMED / IN_PROGRESS / COMPLETED / CANCELLED / REFUNDED |
| `totalPrice` | Decimal(10,2) | Total price in cents |
| `notes` | String? | Customer notes |
| `cancelledAt` | DateTime? | Cancellation timestamp |
| `cancelledBy` | String? | Who cancelled |
| `cancelReason` | String? | Reason for cancellation |

---

## 5. Implementation Files

### 5.1 Controller — `booking.controller.ts`

```typescript
import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../libs/common/guards/jwt-auth.guard';
import { RolesGuard } from '../libs/common/guards/roles.guard';
import { OwnershipGuard } from '../libs/common/guards/ownership.guard';
import { Roles } from '../libs/common/decorators/roles.decorator';
import { BookingService } from './booking.service';

@Controller('businesses/:businessId/bookings')
@UseGuards(JwtAuthGuard, RolesGuard, OwnershipGuard)
@Roles('BUSINESS')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  async list(
    @Param('businessId') businessId: string,
    @Query('date') date?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
  ) {
    return this.bookingService.listByBusiness(businessId, { date, status, page: Number(page) || 1 });
  }

  @Get(':bookingId')
  async findOne(
    @Param('businessId') businessId: string,
    @Param('bookingId') bookingId: string,
  ) {
    return this.bookingService.findById(businessId, bookingId);
  }

  @Patch(':bookingId')
  async updateStatus(
    @Param('businessId') businessId: string,
    @Param('bookingId') bookingId: string,
    @Body('action') action: string,
  ) {
    return this.bookingService.updateStatus(businessId, bookingId, action);
  }
}
```

### 5.2 Service — `booking.service.ts`

```typescript
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

      // Release slot
      await this.prisma.timeSlot.update({
        where: { id: booking.timeSlotId },
        data: { currentBookings: { decrement: 1 } },
      });
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: updateData,
    });

    // Invalidate slot cache
    await this.cache.invalidate(`slots:${businessId}:*`);

    // TODO: Enqueue notifications
    // - CONFIRMED → notify customer
    // - COMPLETED → send review request (24h delay)
    // - CANCELLED → notify customer

    return updated;
  }
}
```

---

## 6. Notification Triggers

| Status Change | Notification |
|---------------|-------------|
| `PENDING → CONFIRMED` | Email + push to customer: "Booking confirmed" |
| `CONFIRMED → IN_PROGRESS` | Push to customer: "Service started" |
| `IN_PROGRESS → COMPLETED` | Email to customer: "Service complete — leave a review" (24h delay) |
| `CONFIRMED → CANCELLED` | Email to customer: "Booking cancelled (no-show)" |

---

## 7. Cache Invalidation

| Event | Cache Key Invalidated |
|-------|----------------------|
| Booking created | `slots:{businessId}:{date}` |
| Booking cancelled | `slots:{businessId}:{date}` |
| Status changed | `admin:dashboard` |

---

## 8. Testing

### Unit Test — `booking.service.spec.ts`

```typescript
describe('BookingService', () => {
  describe('listByBusiness', () => {
    it('should return paginated bookings', async () => { /* ... */ });
    it('should filter by date', async () => { /* ... */ });
    it('should filter by status', async () => { /* ... */ });
  });

  describe('updateStatus', () => {
    it('should confirm a pending booking', async () => { /* ... */ });
    it('should start a confirmed booking', async () => { /* ... */ });
    it('should complete an in-progress booking', async () => { /* ... */ });
    it('should mark as no-show', async () => { /* ... */ });
    it('should throw on invalid transition', async () => { /* ... */ });
    it('should release slot on cancellation', async () => { /* ... */ });
  });
});
```

### E2E Test — `booking-business.e2e-spec.ts`

```typescript
describe('Business Booking Management (e2e)', () => {
  it('GET /businesses/:id/bookings returns bookings', () => { /* ... */ });
  it('PATCH /businesses/:id/bookings/:id confirms booking', () => { /* ... */ });
  it('PATCH /businesses/:id/bookings/:id returns 400 for invalid transition', () => { /* ... */ });
});
```

---

## 9. Security Checklist

- [x] `JwtAuthGuard` — authenticated users only
- [x] `RolesGuard` — BUSINESS role required
- [x] `OwnershipGuard` — only business owner can manage their bookings
- [x] Status transitions validated server-side
- [x] Slot released on cancellation
- [x] Rate limiting via `ThrottlerGuard`

---

## 10. File Summary

| File | Path | Purpose |
|------|------|---------|
| Controller | `src/business/booking.controller.ts` | Route handlers |
| Service | `src/business/booking.service.ts` | Booking lifecycle logic |
| Unit Test | `src/business/booking.service.spec.ts` | Service tests |
| E2E Test | `test/e2e/booking-business.e2e-spec.ts` | Full HTTP tests |

**Total files: 4** (no new DB models — uses existing `Booking` + `TimeSlot` tables)
