# Customer Feature: Booking History

## Brief Description

Booking History lets customers view all their past and upcoming bookings. Customers can filter by status and toggle between upcoming/past views. Each booking shows the business name, service, vehicle, date/time, status, and price.

**Endpoints:**
- `GET /api/v1/customers/me/bookings` — List my bookings (filterable)

**Auth:** CUSTOMER only (owner)
**Cost:** $0

---

## 1. What This Feature Does

### 1.1 List My Bookings
Customer sends `GET /customers/me/bookings?status=CONFIRMED&upcoming=true&page=1`. Backend returns paginated bookings belonging to the authenticated customer, with business, service, and vehicle info joined.

---

## 2. API Contracts

### 2.1 List My Bookings

```
GET /api/v1/customers/me/bookings?status=CONFIRMED&upcoming=true&page=1&limit=20
Authorization: Bearer <customer-jwt>
```

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | string | — | Filter by status |
| `upcoming` | boolean | — | true = future dates only, false = past only |
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Results per page |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "date": "2026-09-15",
      "startTime": "10:00",
      "endTime": "11:00",
      "status": "CONFIRMED",
      "totalPrice": 7500,
      "createdAt": "2026-09-12T14:30:00Z",
      "business": {
        "id": "uuid",
        "name": "Quick Wash Pro",
        "city": "Accra",
        "logo": "logos/b1/logo.png"
      },
      "service": {
        "id": "uuid",
        "name": "Full Detail",
        "category": "DETAILING"
      },
      "vehicle": {
        "id": "uuid",
        "make": "Toyota",
        "model": "Camry",
        "year": 2022,
        "licensePlate": "GR-1234-22"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

---

## 3. Data Model

No new tables. Reads from existing tables:

| Table | Operation |
|-------|-----------|
| `Booking` | Read (filtered by `customerId`) |
| `Business` | Read (name, city, logo) |
| `Service` | Read (name, category) |
| `Vehicle` | Read (make, model, year, plate) |

---

## 4. Implementation Files

### 4.1 DTOs

**`customer/dto/list-bookings.dto.ts`**

```typescript
import { IsOptional, IsIn, IsBooleanString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ListCustomerBookingsDto {
  @IsOptional()
  @IsIn(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REFUNDED'])
  status?: string;

  @IsOptional()
  @IsBooleanString()
  upcoming?: string;

  @IsOptional()
  @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number;
}
```

### 4.2 Service — `customer/booking-history.service.ts`

```typescript
@Injectable()
export class BookingHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(customerId: string, dto: ListCustomerBookingsDto) {
    const where: any = { customerId };
    if (dto.status) where.status = dto.status;
    if (dto.upcoming === 'true') where.date = { gte: new Date() };
    if (dto.upcoming === 'false') where.date = { lt: new Date() };

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          business: { select: { id: true, name: true, city: true, logo: true } },
          service: { select: { id: true, name: true, category: true } },
          vehicle: { select: { id: true, make: true, model: true, year: true, licensePlate: true } },
        },
        orderBy: { date: dto.upcoming === 'false' ? 'desc' : 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { data: bookings, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
}
```

### 4.3 Controller — `customer/customer.controller.ts`

```typescript
@Get('bookings')
findAll(
  @CurrentUser('id') customerId: string,
  @Query() dto: ListCustomerBookingsDto,
) {
  return this.bookingHistoryService.findAll(customerId, dto);
}
```

---

## 5. Security Checklist

- [x] `JwtAuthGuard` — verifies JWT
- [x] `RolesGuard` — ensures `role === 'CUSTOMER'`
- [x] Ownership — queries always filter by `customerId === caller.id`
- [x] No cross-customer data leakage

---

## 6. File Summary

| File | Path | Purpose |
|------|------|---------|
| Controller | `src/customer/customer.controller.ts` | Route handler |
| Service | `src/customer/booking-history.service.ts` | Booking list logic |
| DTO | `src/customer/dto/list-bookings.dto.ts` | Query validation |
| Unit Test | `src/customer/booking-history.service.spec.ts` | Service tests |

**Total files: 4** (no new DB models)
