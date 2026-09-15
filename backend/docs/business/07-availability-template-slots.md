# Business Feature: Availability Template + Slot Instances

## Brief Description

Business owners define **recurring availability rules** (a template) — weekly time windows, slot length, buffer between slots, and max parallel bookings per slot. A background job (`generate-slots`) translates this template into concrete `TimeSlot` rows for the next 30 days. Customers query available slots when booking. Changing the template triggers reconciliation: empty slots outside new hours are deleted, slots with bookings are flagged for manual reschedule.

This is the core scheduling engine of the platform — every booking references a TimeSlot.

**Endpoints:**
- `GET /api/v1/businesses/:id/availability` — Get current template (owner only)
- `PUT /api/v1/businesses/:id/availability` — Update template (owner only, triggers slot regen)
- `GET /api/v1/businesses/:id/slots?date=&serviceId=` — View available slots (public)

**Auth:** BUSINESS role (template CRUD), Public (slot view)
**Cost:** $0 (Upstash Redis for slot caching, 60s TTL)

---

## 1. What This Feature Does

### 1.1 Availability Template (§4.1)
The template is a **recurring rule set** — not individual slots. It defines:
- **slotLengthMinutes**: How long each slot is (15–240, default 30)
- **bufferMinutes**: Gap between slots (0–60, default 0)
- **maxParallel**: How many bookings can overlap in one slot (1–10, default 1)
- **weekly**: JSON object mapping day keys to arrays of `[start, end]` time windows
- **blackouts**: Array of date strings (YYYY-MM-DD) when the business is closed

Example template:
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
  "blackouts": ["2026-12-25", "2026-01-01"]
}
```

### 1.2 Slot Generation (§4.2)
A background job (`generate-slots`) runs **nightly** and **on template change**:
1. Loads the template + business timezone.
2. For each day from today to today+30:
   - Skip if the date is a blackout or the business is closed that weekday.
   - Slice each open window into `[start, end)` chunks of `slotLength + buffer`.
   - **Upsert** a `TimeSlot` row using `ON CONFLICT DO NOTHING` — never overwrites `currentBookings`.
3. Past slots (`date < today`) are marked `isAvailable=false`.

### 1.3 Reconciliation on Hours Change (§4.3)
When the template changes, a `reconcile-future-slots` job runs:
- For future dates, find slots outside the new hours.
- If `currentBookings == 0` → **delete** the slot.
- If `currentBookings > 0` → **keep** the slot, mark `orphaned=true`, notify the business owner to reschedule.
- **Never auto-cancel paid bookings.**

### 1.4 Public Slot Query (§4.4)
Customers query `GET /businesses/:id/slots?date=2026-09-20&serviceId=...`:
1. Validate business is verified + active, date is within `[today, today+30]`.
2. Load the service's `durationMinutes` → filter slots where slot duration >= service duration.
3. Return `[{ startTime, endTime, remaining, isAvailable }]` sorted ascending.
4. Cache result in Redis for 60 seconds (`slots:{businessId}:{date}`).
5. Cache invalidated on: booking create, booking cancel, template update.

---

## 2. API Contracts

### 2.1 Get Template (Owner Only)

```
GET /api/v1/businesses/:id/availability
Authorization: Bearer <business-jwt>
```

**Response — Success:**
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
    "blackouts": ["2026-12-25", "2026-01-01"],
    "createdAt": "2026-09-01T10:00:00Z",
    "updatedAt": "2026-09-10T14:30:00Z"
  }
}
```

**Response — Not Found:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "No availability template found"
  }
}
```

### 2.2 Update Template (Owner Only)

```
PUT /api/v1/businesses/:id/availability
Authorization: Bearer <business-jwt>
```

**Request Body:**
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

**Validation Rules:**

| Field | Rule |
|-------|------|
| `slotLengthMinutes` | Integer, 15–240 |
| `bufferMinutes` | Integer, 0–60 |
| `maxParallel` | Integer, 1–10 |
| `weekly` | Object with day keys (`mon`–`sun`), each value is `string[][]` (pairs of `"HH:MM"`) |
| `blackouts` | Array of date strings `YYYY-MM-DD` |
| `slotLengthMinutes` must divide evenly into every window | e.g., 30min slots in a 4h window = 8 slots |

**Response:** Upserted template object. Slot regeneration runs asynchronously in background.

### 2.3 View Slots (Public)

```
GET /api/v1/businesses/:id/slots?date=2026-09-20&serviceId=svc-1
```

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `date` | string | Yes | Date in `YYYY-MM-DD` format |
| `serviceId` | uuid | No | If provided, filter slots by service duration |

**Response — Success:**
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

**Response — Invalid Date:**
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid date format"
  }
}
```

**Response — Business Not Found:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Business not found"
  }
}
```

---

## 3. Data Model

### AvailabilityTemplate Table

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `businessId` | UUID | FK → Business, **unique** (one template per business) |
| `slotLengthMinutes` | Int | Slot duration, default 30 |
| `bufferMinutes` | Int | Buffer between slots, default 0 |
| `maxParallel` | Int | Max concurrent bookings per slot, default 1 |
| `weekly` | Json | `Record<string, string[][]>` — day key → time windows |
| `blackouts` | String[] | Blackout dates (YYYY-MM-DD) |
| `createdAt` | DateTime | Created at |
| `updatedAt` | DateTime | Updated at |

### TimeSlot Table

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `businessId` | UUID | FK → Business |
| `date` | Date | Slot date (DB Date type) |
| `startTime` | String | `"HH:MM"` format |
| `endTime` | String | `"HH:MM"` format |
| `isAvailable` | Boolean | Whether slot accepts new bookings |
| `maxBookings` | Int | Max concurrent bookings (from `maxParallel`) |
| `currentBookings` | Int | Current booking count |
| `createdAt` | DateTime | Created at |

**Unique constraint:** `@@unique([businessId, date, startTime])`
**No `updatedAt`** — slots are immutable after creation (only `currentBookings` changes via booking lifecycle).

---

## 4. Slot Generation Algorithm

### 4.1 Window Slicing

Given a time window `"09:00"–"17:00"`, `slotLength=30`, `buffer=10`:

```
09:00 → 09:30  (slot 1)
09:40 → 10:10  (slot 2, 10min buffer)
10:20 → 10:50  (slot 3)
...
15:20 → 15:50  (last slot that fits)
```

Algorithm:
```
current = startMinutes
while current + slotLength <= endMinutes:
    create slot [current, current + slotLength]
    current += slotLength + buffer
```

### 4.2 Upsert Strategy

Use Prisma `upsert` with `ON CONFLICT DO NOTHING`:
- **Never overwrite** `currentBookings` — a slot may already have bookings from a previous generation.
- New slots get `currentBookings: 0`.
- Existing slots are left untouched (idempotent).

### 4.3 Horizon

Generate slots for `today` through `today + 30 days`. Nightly job refreshes the rolling window.

---

## 5. Reconciliation on Hours Change

When the template is updated, a `reconcile-future-slots` job runs:

```
For each future date (today..today+30):
  1. Compute new set of allowed startTimes from new template.
  2. Find existing TimeSlots for this date.
  3. For each existing slot:
     - If startTime NOT in new set:
       - If currentBookings == 0 → DELETE slot
       - If currentBookings > 0 → KEEP slot, mark orphaned=true, notify owner
  4. For each new startTime not yet in DB → INSERT (standard generation)
```

**Critical rule:** Never auto-cancel paid bookings. The business owner must manually reschedule orphaned bookings.

---

## 6. Cache Strategy

| Event | Cache Key Pattern | Action |
|-------|-------------------|--------|
| Template updated | `slots:{businessId}:*` | Invalidate all dates |
| Booking created | `slots:{businessId}:{date}` | Invalidate specific date |
| Booking cancelled | `slots:{businessId}:{date}` | Invalidate specific date |
| Slot regeneration | `slots:{businessId}:*` | Invalidate all dates |

Cache TTL: 60 seconds. Key built by `CacheService.slotsKey(businessId, date)`.

---

## 7. Concurrency & Safety

| Concern | Solution |
|---------|----------|
| Oversell (2 bookings on 1-capacity slot) | `SELECT ... FOR UPDATE` on TimeSlot row during booking creation (§6.2) |
| Slot overwrite during regeneration | `ON CONFLICT DO NOTHING` — never touches `currentBookings` |
| Auto-cancel paid bookings | Reconciliation never deletes slots with `currentBookings > 0` |
| Past slot access | `isAvailable=false` for `date < today`, query filters it out |
| Template change during active booking | Orphaned slots flagged, owner notified, bookings preserved |

---

## 8. Implementation Files

### 8.1 DTOs

**`business/dto/update-availability.dto.ts`**
```typescript
import { IsNumber, IsArray, IsString, IsObject, Min, Max } from 'class-validator';

export class UpdateAvailabilityDto {
  @IsNumber() @Min(15) @Max(240)
  slotLengthMinutes!: number;

  @IsNumber() @Min(0) @Max(60)
  bufferMinutes!: number;

  @IsNumber() @Min(1) @Max(10)
  maxParallel!: number;

  @IsObject()
  weekly!: Record<string, string[][]>;

  @IsArray() @IsString({ each: true })
  blackouts!: string[];
}
```

### 8.2 Controller — `business/availability.controller.ts`

```typescript
@Controller('businesses/:businessId')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get('availability')
  @UseGuards(JwtAuthGuard, RolesGuard, OwnershipGuard)
  @Roles('BUSINESS')
  async getTemplate(@Param('businessId') businessId: string) { ... }

  @Put('availability')
  @UseGuards(JwtAuthGuard, RolesGuard, OwnershipGuard)
  @Roles('BUSINESS')
  async updateTemplate(
    @Param('businessId') businessId: string,
    @Body() dto: UpdateAvailabilityDto,
  ) { ... }

  @Get('slots')
  async getSlots(
    @Param('businessId') businessId: string,
    @Query('date') date: string,
    @Query('serviceId') serviceId?: string,
  ) { ... }
}
```

### 8.3 Service — `business/availability.service.ts`

```typescript
@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getTemplate(businessId: string) { ... }
  async updateTemplate(businessId: string, dto: UpdateAvailabilityDto) { ... }
  async getSlots(businessId: string, dateStr: string, serviceId?: string) { ... }

  private timeToMinutes(time: string): number { ... }
}
```

### 8.4 Background Job — `worker/processors/generate-slots.processor.ts`

```typescript
// Runs nightly + on template change
async function generateSlots(businessId: string, horizonDays: number = 30) {
  // 1. Load template
  // 2. For each day today..today+30:
  //    - Skip blackouts / closed days
  //    - Slice windows into slots
  //    - Upsert TimeSlot with ON CONFLICT DO NOTHING
}
```

### 8.5 Background Job — `worker/processors/reconcile-slots.processor.ts`

```typescript
// Runs on template change
async function reconcileFutureSlots(businessId: string) {
  // 1. Load new template
  // 2. For each future date:
  //    - Compute new allowed startTimes
  //    - Find orphaned slots (not in new set)
  //    - Delete if currentBookings == 0
  //    - Flag + notify if currentBookings > 0
}
```

### 8.6 Module — `business/business.module.ts`

```typescript
@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [AvailabilityController, ...],
  providers: [AvailabilityService, ...],
  exports: [AvailabilityService],
})
export class BusinessModule {}
```

---

## 9. Edge Cases

| Scenario | Behavior |
|----------|----------|
| No template exists | `getTemplate` → 404, `getSlots` → empty array |
| Template has no windows for a day | No slots generated for that day |
| Blackout date | No slots generated |
| Slot length doesn't divide evenly into window | Remaining time at end of window is unused (e.g., 47min left, 30min slot → 1 slot, 17min unused) |
| Service duration > slot length | Slot filtered out (doesn't fit) |
| Service duration = slot length exactly | Slot included |
| Buffer > window length | No slots generated (algorithm exits immediately) |
| Date in the past | `getSlots` returns empty (all slots `isAvailable=false`) |
| Date > today+30 | No slots exist yet (outside generation horizon) |
| Business not verified | `getSlots` → 404 (business not found or not verified) |

---

## 10. Security Checklist

- [x] `JwtAuthGuard` — authenticated users only (template endpoints)
- [x] `RolesGuard` — BUSINESS role required for template CRUD
- [x] `OwnershipGuard` — only the business owner can update their template
- [x] Public slot view requires no auth
- [x] Business must be `isVerified=true` and `isActive=true` for public slot view
- [x] Slot generation never overwrites existing bookings (`ON CONFLICT DO NOTHING`)
- [x] Reconciliation never auto-cancels paid bookings
- [x] Rate limiting via `ThrottlerGuard` (default: 100 req/min/IP)

---

## 11. File Summary

| File | Path | Purpose |
|------|------|---------|
| Controller | `src/business/availability.controller.ts` | Route handlers for template + slots |
| Service | `src/business/availability.service.ts` | Template CRUD + slot query logic |
| DTO | `src/business/dto/update-availability.dto.ts` | Input validation |
| Background Job | `worker/processors/generate-slots.processor.ts` | Nightly slot generation |
| Background Job | `worker/processors/reconcile-slots.processor.ts` | Reconciliation on hours change |
| Module | `src/business/business.module.ts` | NestJS module wiring |
| Unit Test | `src/business/availability.service.spec.ts` | Service logic tests |
| E2E Test | `test/e2e/availability.e2e-spec.ts` | Full HTTP tests |
| Unit Test | `test/unit/slots.service.test.ts` | Slot generation algorithm tests |

**Total files: 9** (uses existing `AvailabilityTemplate` + `TimeSlot` tables — no new DB models)

---

## 12. Related Sections in BACKEND.md

- §4.1 — Availability Template (recurring rules)
- §4.2 — Slot Generation (worker / cron)
- §4.3 — Reconciliation on Hours Change
- §4.4 — Public Availability Query
- §6.2 — Booking Create (slot locking via `SELECT ... FOR UPDATE`)
- §6.5 — Booking Cancel (slot release via `currentBookings--`)
- §11 — Notifications (slot-related triggers)
- §15.4 — `libs/cache/cache.service.ts` (cache key builders)
- §15.6 — `worker/processors/generate-slots.processor.ts`
- §15.6 — `worker/processors/reconcile-slots.processor.ts`
