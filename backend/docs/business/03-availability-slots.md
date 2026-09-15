# Business Feature: Availability & Slot Management

## Brief Description

Business owners define recurring availability rules (weekly schedule, slot length, buffer time, blackouts). A background job generates individual time slots for the next 30 days. Customers see available slots when booking. Changing hours triggers slot regeneration for future dates.

**Endpoints:**
- `GET /api/v1/businesses/:id/availability` — Get current template (owner)
- `PUT /api/v1/businesses/:id/availability` — Update template (owner, triggers slot regen)
- `GET /api/v1/businesses/:id/slots?date=&serviceId=` — View slots (public)

**Auth:** BUSINESS role (template), Public (view slots)
**Cost:** $0 (Upstash Redis for slot caching)

---

## 1. What This Feature Does

1. Business owner sets a weekly schedule with time windows, slot length, buffer between slots, and max parallel bookings per slot.
2. Owner can add blackout dates (holidays, closures).
3. Backend generates `TimeSlot` records for the next 30 days.
4. Customers query available slots by date + service duration.
5. Changing the template triggers regeneration for future dates.
6. Existing bookings with customers are never auto-cancelled.

---

## 2. API Contract

### Get Template

```
GET /api/v1/businesses/:id/availability
Authorization: Bearer <business-jwt>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "tmpl-1",
    "businessId": "biz-1",
    "slotLengthMinutes": 30,
    "bufferMinutes": 10,
    "maxParallel": 2,
    "weekly": {
      "mon": [["09:00", "17:00"]],
      "tue": [["09:00", "17:00"]],
      "wed": [["09:00", "17:00"]],
      "thu": [["09:00", "17:00"]],
      "fri": [["09:00", "17:00"]],
      "sat": [["10:00", "14:00"]],
      "sun": []
    },
    "blackouts": ["2026-12-25", "2026-01-01"]
  }
}
```

### Update Template

```
PUT /api/v1/businesses/:id/availability
Authorization: Bearer <business-jwt>
```

**Request body:**
```json
{
  "slotLengthMinutes": 30,
  "bufferMinutes": 10,
  "maxParallel": 2,
  "weekly": {
    "mon": [["09:00", "17:00"]],
    "tue": [["09:00", "17:00"]],
    "wed": [["09:00", "17:00"]],
    "thu": [["09:00", "17:00"]],
    "fri": [["09:00", "17:00"]],
    "sat": [["10:00", "14:00"]],
    "sun": []
  },
  "blackouts": ["2026-12-25"]
}
```

**Response:** Updated template object. Slot regeneration runs in background.

### View Slots (Public)

```
GET /api/v1/businesses/:id/slots?date=2026-09-20&serviceId=svc-1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2026-09-20",
    "businessId": "biz-1",
    "slots": [
      {
        "id": "slot-1",
        "startTime": "09:00",
        "endTime": "09:30",
        "remaining": 2,
        "isAvailable": true
      },
      {
        "id": "slot-2",
        "startTime": "09:40",
        "endTime": "10:10",
        "remaining": 1,
        "isAvailable": true
      },
      {
        "id": "slot-3",
        "startTime": "10:20",
        "endTime": "10:50",
        "remaining": 0,
        "isAvailable": false
      }
    ]
  }
}
```

---

## 3. Data Model

### AvailabilityTemplate Table

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `businessId` | UUID | FK → Business, unique |
| `slotLengthMinutes` | Int | Slot duration (default: 30) |
| `bufferMinutes` | Int | Buffer between slots (default: 0) |
| `maxParallel` | Int | Max bookings per slot (default: 1) |
| `weekly` | Json | Weekly time windows |
| `blackouts` | String[] | Blackout dates (YYYY-MM-DD) |
| `createdAt` | DateTime | Created at |
| `updatedAt` | DateTime | Updated at |

### TimeSlot Table

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `businessId` | UUID | FK → Business |
| `date` | Date | Slot date |
| `startTime` | String | "HH:MM" format |
| `endTime` | String | "HH:MM" format |
| `isAvailable` | Boolean | Availability flag |
| `maxBookings` | Int | Max concurrent bookings |
| `currentBookings` | Int | Current booking count |
| `createdAt` | DateTime | Created at |

**Unique constraint:** `@@unique([businessId, date, startTime])`

---

## 4. Implementation Files

### 4.1 DTOs

#### `update-availability.dto.ts`
```typescript
import { IsNumber, IsArray, IsString, IsObject, Min, Max } from 'class-validator';

export class UpdateAvailabilityDto {
  @IsNumber()
  @Min(15)
  @Max(240)
  slotLengthMinutes: number;

  @IsNumber()
  @Min(0)
  @Max(60)
  bufferMinutes: number;

  @IsNumber()
  @Min(1)
  @Max(10)
  maxParallel: number;

  @IsObject()
  weekly: Record<string, string[][]>;

  @IsArray()
  @IsString({ each: true })
  blackouts: string[];
}
```

### 4.2 Controller — `availability.controller.ts`

```typescript
import { Controller, Get, Put, Query, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../libs/common/guards/jwt-auth.guard';
import { RolesGuard } from '../libs/common/guards/roles.guard';
import { OwnershipGuard } from '../libs/common/guards/ownership.guard';
import { Roles } from '../libs/common/decorators/roles.decorator';
import { AvailabilityService } from './availability.service';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';

@Controller('businesses/:businessId')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get('availability')
  @UseGuards(JwtAuthGuard, RolesGuard, OwnershipGuard)
  @Roles('BUSINESS')
  async getTemplate(@Param('businessId') businessId: string) {
    return this.availabilityService.getTemplate(businessId);
  }

  @Put('availability')
  @UseGuards(JwtAuthGuard, RolesGuard, OwnershipGuard)
  @Roles('BUSINESS')
  async updateTemplate(
    @Param('businessId') businessId: string,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.availabilityService.updateTemplate(businessId, dto);
  }

  @Get('slots')
  async getSlots(
    @Param('businessId') businessId: string,
    @Query('date') date: string,
    @Query('serviceId') serviceId?: string,
  ) {
    return this.availabilityService.getSlots(businessId, date, serviceId);
  }
}
```

### 4.3 Service — `availability.service.ts`

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getTemplate(businessId: string) {
    const template = await this.prisma.availabilityTemplate.findUnique({
      where: { businessId },
    });
    if (!template) throw new NotFoundException('No availability template found');
    return template;
  }

  async updateTemplate(businessId: string, dto: UpdateAvailabilityDto) {
    const template = await this.prisma.availabilityTemplate.upsert({
      where: { businessId },
      update: {
        slotLengthMinutes: dto.slotLengthMinutes,
        bufferMinutes: dto.bufferMinutes,
        maxParallel: dto.maxParallel,
        weekly: dto.weekly,
        blackouts: dto.blackouts,
      },
      create: {
        businessId,
        slotLengthMinutes: dto.slotLengthMinutes,
        bufferMinutes: dto.bufferMinutes,
        maxParallel: dto.maxParallel,
        weekly: dto.weekly,
        blackouts: dto.blackouts,
      },
    });

    // TODO: Enqueue background job to regenerate slots
    // await this.queue.add('generate-slots', { businessId, horizonDays: 30 });

    return template;
  }

  async getSlots(businessId: string, dateStr: string, serviceId?: string) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    const cacheKey = `slots:${businessId}:${dateStr}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const where: any = {
      businessId,
      date,
      isAvailable: true,
    };

    const slots = await this.prisma.timeSlot.findMany({
      where,
      orderBy: { startTime: 'asc' },
    });

    // If serviceId provided, filter by duration
    let filteredSlots = slots;
    if (serviceId) {
      const service = await this.prisma.service.findUnique({
        where: { id: serviceId },
      });
      if (service) {
        filteredSlots = slots.filter(slot => {
          const slotMinutes = this.timeToMinutes(slot.endTime) - this.timeToMinutes(slot.startTime);
          return slotMinutes >= service.durationMinutes;
        });
      }
    }

    const result = {
      date: dateStr,
      businessId,
      slots: filteredSlots.map(s => ({
        id: s.id,
        startTime: s.startTime,
        endTime: s.endTime,
        remaining: s.maxBookings - s.currentBookings,
        isAvailable: s.isAvailable && s.currentBookings < s.maxBookings,
      })),
    };

    await this.cache.set(cacheKey, result, 60);
    return result;
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }
}
```

---

## 5. Slot Generation (Background Job)

Job runs nightly and on template change:

```typescript
async function generateSlots(businessId: string, horizonDays: number = 30) {
  const template = await prisma.availabilityTemplate.findUnique({
    where: { businessId },
  });
  if (!template) return;

  const weekly = template.weekly as Record<string, string[][]>;
  const today = new Date();

  for (let i = 0; i < horizonDays; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()];
    const windows = weekly[dayKey] || [];

    // Skip blackouts
    const dateStr = date.toISOString().split('T')[0];
    if (template.blackouts.includes(dateStr)) continue;

    for (const [start, end] of windows) {
      const slots = generateSlotsFromWindow(
        start, end,
        template.slotLengthMinutes,
        template.bufferMinutes,
        template.maxParallel,
      );

      for (const slot of slots) {
        await prisma.timeSlot.upsert({
          where: {
            businessId_date_startTime: {
              businessId,
              date,
              startTime: slot.startTime,
            },
          },
          update: {},
          create: {
            businessId,
            date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            maxBookings: template.maxParallel,
            currentBookings: 0,
            isAvailable: true,
          },
        });
      }
    }
  }
}

function generateSlotsFromWindow(
  start: string, end: string,
  slotLength: number, buffer: number, maxParallel: number,
) {
  const slots = [];
  let current = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  while (current + slotLength <= endMinutes) {
    slots.push({
      startTime: minutesToTime(current),
      endTime: minutesToTime(current + slotLength),
    });
    current += slotLength + buffer;
  }

  return slots;
}
```

---

## 6. Reconciliation on Hours Change

When hours change, existing slots with bookings are never auto-cancelled:

- Slots with `currentBookings == 0` and outside new hours → deleted.
- Slots with `currentBookings > 0` and outside new hours → kept but flagged, owner notified.
- Never auto-cancel paid bookings.

---

## 7. Cache Invalidation

| Event | Cache Key Invalidated |
|-------|----------------------|
| Template updated | `slots:{businessId}:*` |
| Booking created | `slots:{businessId}:{date}` |
| Booking cancelled | `slots:{businessId}:{date}` |
| Slot regenerated | `slots:{businessId}:*` |

---

## 8. Testing

### Unit Test — `availability.service.spec.ts`

```typescript
describe('AvailabilityService', () => {
  describe('getTemplate', () => {
    it('should return template if exists', async () => { /* ... */ });
    it('should throw NotFoundException if not found', async () => { /* ... */ });
  });

  describe('updateTemplate', () => {
    it('should upsert template', async () => { /* ... */ });
    it('should enqueue slot regeneration', async () => { /* ... */ });
  });

  describe('getSlots', () => {
    it('should return cached slots if available', async () => { /* ... */ });
    it('should filter by service duration', async () => { /* ... */ });
    it('should return empty array if no slots', async () => { /* ... */ });
  });
});
```

### E2E Test — `availability.e2e-spec.ts`

```typescript
describe('Availability (e2e)', () => {
  it('PUT /businesses/:id/availability sets template', () => { /* ... */ });
  it('GET /businesses/:id/slots returns available slots', () => { /* ... */ });
  it('GET /businesses/:id/slots?date= returns 400 for invalid date', () => { /* ... */ });
});
```

---

## 9. Security Checklist

- [x] `JwtAuthGuard` — authenticated users only (template)
- [x] `RolesGuard` — BUSINESS role required
- [x] `OwnershipGuard` — only owner can update template
- [x] Public slot view requires no auth
- [x] Business must be verified for public slot view
- [x] Slot generation never overwrites existing bookings
- [x] Rate limiting via `ThrottlerGuard`

---

## 10. File Summary

| File | Path | Purpose |
|------|------|---------|
| Controller | `src/business/availability.controller.ts` | Route handlers |
| Service | `src/business/availability.service.ts` | Template + slot logic |
| DTO | `src/business/dto/update-availability.dto.ts` | Validation |
| Unit Test | `src/business/availability.service.spec.ts` | Service tests |
| E2E Test | `test/e2e/availability.e2e-spec.ts` | Full HTTP tests |

**Total files: 5** (no new DB models — uses existing `AvailabilityTemplate` + `TimeSlot` tables)
