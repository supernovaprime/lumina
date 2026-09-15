# Business Feature: Service & Pricing Management

## Brief Description

Business owners create and manage the services they offer — name, category, base price, duration. Each service can have price modifiers based on vehicle type/size. Services are soft-deleted to preserve booking history. Price changes only affect future bookings.

**Endpoints:**
- `GET /api/v1/businesses/:id/services` — List services (public, active only)
- `POST /api/v1/businesses/:id/services` — Create service (owner)
- `PATCH /api/v1/businesses/:id/services/:serviceId` — Update service (owner)
- `DELETE /api/v1/businesses/:id/services/:serviceId` — Soft delete (owner)
- `PUT /api/v1/businesses/:id/services/:serviceId/modifiers` — Set price modifiers (owner)

**Auth:** BUSINESS role (create/update/delete), Public (list)
**Cost:** $0

---

## 1. What This Feature Does

1. Business owner adds services (e.g., "Basic Wash", "Full Detail") with a base price and duration.
2. Optional price modifiers adjust pricing per vehicle type/size (e.g., SUV = 1.2x, Truck = +$5).
3. Services can be deactivated (soft delete) — active bookings are preserved.
4. Price/duration changes apply only to future bookings (financial record integrity).
5. Public listing shows only active services for verified businesses.

---

## 2. API Contract

### List Services (Public)

```
GET /api/v1/businesses/:id/services?activeOnly=true
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "svc-1",
      "businessId": "biz-1",
      "name": "Basic Wash",
      "description": "Exterior wash with soap and rinse",
      "category": "EXTERIOR",
      "basePrice": 2500,
      "durationMinutes": 30,
      "isActive": true,
      "priceModifiers": [
        { "vehicleType": "SUV", "vehicleSize": "LARGE", "multiplier": 1.20 },
        { "vehicleType": "TRUCK", "vehicleSize": "LARGE", "multiplier": 1.30 }
      ]
    }
  ]
}
```

### Create Service

```
POST /api/v1/businesses/:id/services
Authorization: Bearer <business-jwt>
```

**Request body:**
```json
{
  "name": "Basic Wash",
  "description": "Exterior wash with soap and rinse",
  "category": "EXTERIOR",
  "basePrice": 2500,
  "durationMinutes": 30
}
```

**Response:** `201` with created service object.

### Update Service

```
PATCH /api/v1/businesses/:id/services/:serviceId
Authorization: Bearer <business-jwt>
```

**Request body (partial):**
```json
{
  "basePrice": 3000,
  "name": "Premium Wash"
}
```

**Note:** Price/duration changes apply only to future bookings.

### Delete Service (Soft)

```
DELETE /api/v1/businesses/:id/services/:serviceId
Authorization: Bearer <business-jwt>
```

**Response — Error (has future bookings):**
```json
{
  "success": false,
  "error": {
    "code": "HAS_FUTURE_BOOKINGS",
    "message": "Cannot delete service with 3 future bookings. Cancel or reschedule them first."
  }
}
```

### Set Price Modifiers

```
PUT /api/v1/businesses/:id/services/:serviceId/modifiers
Authorization: Bearer <business-jwt>
```

**Request body:**
```json
{
  "modifiers": [
    { "vehicleType": "SEDAN", "vehicleSize": "COMPACT", "multiplier": 1.0 },
    { "vehicleType": "SEDAN", "vehicleSize": "MEDIUM", "multiplier": 1.0 },
    { "vehicleType": "SUV", "vehicleSize": "MEDIUM", "multiplier": 1.15 },
    { "vehicleType": "SUV", "vehicleSize": "LARGE", "multiplier": 1.25 },
    { "vehicleType": "TRUCK", "vehicleSize": "LARGE", "multiplier": 1.30 },
    { "vehicleType": "VAN", "vehicleSize": "LARGE", "multiplier": 1.35 },
    { "vehicleType": "MOTORCYCLE", "vehicleSize": "COMPACT", "multiplier": 0.80 }
  ]
}
```

**Response:** `200` with updated modifiers array.

---

## 3. Data Model

### Service Table

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `businessId` | UUID | FK → Business |
| `name` | String | Service name |
| `description` | String? | Optional description |
| `category` | Enum | EXTERIOR / INTERIOR / FULL_WASH / DETAILING / ADD_ONS |
| `basePrice` | Decimal(10,2) | Price in minor units (cents) |
| `durationMinutes` | Int | Duration in minutes |
| `isActive` | Boolean | Soft delete flag |

### PriceModifier Table

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `serviceId` | UUID | FK → Service |
| `vehicleType` | Enum | SEDAN / SUV / TRUCK / VAN / MOTORCYCLE |
| `vehicleSize` | Enum | COMPACT / MEDIUM / LARGE |
| `multiplier` | Decimal(3,2) | Price multiplier (e.g., 1.20 = 20% more) |

**Unique constraint:** `@@unique([serviceId, vehicleType, vehicleSize])`

---

## 4. Implementation Files

### 4.1 DTOs

#### `create-service.dto.ts`
```typescript
import { IsString, IsOptional, IsNumber, IsEnum, Min, Max } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(['EXTERIOR', 'INTERIOR', 'FULL_WASH', 'DETAILING', 'ADD_ONS'])
  category: string;

  @IsNumber()
  @Min(100)
  basePrice: number;

  @IsNumber()
  @Min(15)
  @Max(480)
  durationMinutes: number;
}
```

#### `update-service.dto.ts`
```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateServiceDto } from './create-service.dto';

export class UpdateServiceDto extends PartialType(CreateServiceDto) {}
```

#### `price-modifier.dto.ts`
```typescript
import { IsArray, ValidateNested, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PriceModifierItemDto {
  @IsString()
  vehicleType: string;

  @IsString()
  vehicleSize: string;

  @IsNumber()
  @Min(0.5)
  @Max(3.0)
  multiplier: number;
}

export class SetPriceModifiersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceModifierItemDto)
  modifiers: PriceModifierItemDto[];
}
```

### 4.2 Controller — `service.controller.ts`

```typescript
import { Controller, Get, Post, Patch, Delete, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../libs/common/guards/jwt-auth.guard';
import { RolesGuard } from '../libs/common/guards/roles.guard';
import { OwnershipGuard } from '../libs/common/guards/ownership.guard';
import { Roles } from '../libs/common/decorators/roles.decorator';
import { ServiceService } from './service.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { SetPriceModifiersDto } from './dto/price-modifier.dto';

@Controller('businesses/:businessId/services')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Get()
  async findAll(
    @Param('businessId') businessId: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.serviceService.findAll(businessId, activeOnly !== 'false');
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, OwnershipGuard)
  @Roles('BUSINESS')
  async create(@Param('businessId') businessId: string, @Body() dto: CreateServiceDto) {
    return this.serviceService.create(businessId, dto);
  }

  @Patch(':serviceId')
  @UseGuards(JwtAuthGuard, RolesGuard, OwnershipGuard)
  @Roles('BUSINESS')
  async update(
    @Param('businessId') businessId: string,
    @Param('serviceId') serviceId: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.serviceService.update(businessId, serviceId, dto);
  }

  @Delete(':serviceId')
  @UseGuards(JwtAuthGuard, RolesGuard, OwnershipGuard)
  @Roles('BUSINESS')
  async remove(
    @Param('businessId') businessId: string,
    @Param('serviceId') serviceId: string,
  ) {
    return this.serviceService.remove(businessId, serviceId);
  }

  @Put(':serviceId/modifiers')
  @UseGuards(JwtAuthGuard, RolesGuard, OwnershipGuard)
  @Roles('BUSINESS')
  async setModifiers(
    @Param('businessId') businessId: string,
    @Param('serviceId') serviceId: string,
    @Body() dto: SetPriceModifiersDto,
  ) {
    return this.serviceService.setModifiers(businessId, serviceId, dto.modifiers);
  }
}
```

### 4.3 Service — `service.service.ts`

```typescript
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async findAll(businessId: string, activeOnly = true) {
    return this.prisma.service.findMany({
      where: {
        businessId,
        ...(activeOnly ? { isActive: true } : {}),
      },
      include: { priceModifiers: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(businessId: string, dto: CreateServiceDto) {
    return this.prisma.service.create({
      data: {
        businessId,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        basePrice: dto.basePrice,
        durationMinutes: dto.durationMinutes,
      },
    });
  }

  async update(businessId: string, serviceId: string, dto: UpdateServiceDto) {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, businessId },
    });
    if (!service) throw new NotFoundException('Service not found');

    return this.prisma.service.update({
      where: { id: serviceId },
      data: dto,
    });
  }

  async remove(businessId: string, serviceId: string) {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, businessId },
    });
    if (!service) throw new NotFoundException('Service not found');

    // Block if future bookings exist
    const futureBookings = await this.prisma.booking.count({
      where: {
        serviceId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        date: { gte: new Date() },
      },
    });

    if (futureBookings > 0) {
      throw new ConflictException({
        code: 'HAS_FUTURE_BOOKINGS',
        message: `Cannot delete service with ${futureBookings} future bookings. Cancel or reschedule them first.`,
      });
    }

    return this.prisma.service.update({
      where: { id: serviceId },
      data: { isActive: false },
    });
  }

  async setModifiers(businessId: string, serviceId: string, modifiers: any[]) {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, businessId },
    });
    if (!service) throw new NotFoundException('Service not found');

    // Delete existing, create new (bulk replace)
    await this.prisma.$transaction([
      this.prisma.priceModifier.deleteMany({ where: { serviceId } }),
      ...modifiers.map(m =>
        this.prisma.priceModifier.create({
          data: {
            serviceId,
            vehicleType: m.vehicleType,
            vehicleSize: m.vehicleSize,
            multiplier: m.multiplier,
          },
        }),
      ),
    ]);

    return this.prisma.priceModifier.findMany({ where: { serviceId } });
  }
}
```

---

## 5. Price Resolution (Booking Flow)

When a customer creates a booking, the backend resolves the price:

```
unitPrice = basePrice * multiplier + fixedDelta
totalPrice = unitPrice (MVP: single service per booking)
```

- `basePrice` comes from `Service.basePrice` (cents).
- `multiplier` comes from `PriceModifier` matching the customer's vehicle `type` + `size`.
- If no modifier matches, `multiplier = 1.0` (base price).
- Price is always computed server-side — never trust client-sent totals.

---

## 6. Cache Invalidation

| Event | Cache Key Invalidated |
|-------|----------------------|
| Service created | `business:{id}` |
| Service updated | `business:{id}` |
| Service deleted | `business:{id}` |
| Modifiers changed | `business:{id}` |

---

## 7. Testing

### Unit Test — `service.service.spec.ts`

```typescript
describe('ServiceService', () => {
  describe('create', () => {
    it('should create a new service', async () => { /* ... */ });
    it('should default isActive to true', async () => { /* ... */ });
  });

  describe('remove', () => {
    it('should soft-delete service with no future bookings', async () => { /* ... */ });
    it('should throw ConflictException if future bookings exist', async () => { /* ... */ });
    it('should throw NotFoundException if service not found', async () => { /* ... */ });
  });

  describe('setModifiers', () => {
    it('should replace all modifiers', async () => { /* ... */ });
    it('should handle empty modifiers array', async () => { /* ... */ });
  });
});
```

### E2E Test — `service.e2e-spec.ts`

```typescript
describe('Service Management (e2e)', () => {
  it('GET /businesses/:id/services returns active services', () => { /* ... */ });
  it('POST /businesses/:id/services creates service', () => { /* ... */ });
  it('DELETE /businesses/:id/services/:id blocks if future bookings', () => { /* ... */ });
  it('PUT /businesses/:id/services/:id/modifiers replaces modifiers', () => { /* ... */ });
});
```

---

## 8. Security Checklist

- [x] `JwtAuthGuard` — authenticated users only (mutations)
- [x] `RolesGuard` — BUSINESS role required
- [x] `OwnershipGuard` — only business owner can manage services
- [x] Price computed server-side — never trust client total
- [x] Soft delete preserves financial records
- [x] Future booking check prevents broken references
- [x] Rate limiting via `ThrottlerGuard`

---

## 9. File Summary

| File | Path | Purpose |
|------|------|---------|
| Controller | `src/business/service.controller.ts` | Service route handlers |
| Service | `src/business/service.service.ts` | Service business logic |
| Module | `src/business/business.module.ts` | Shared module with business |
| Create DTO | `src/business/dto/create-service.dto.ts` | Validation |
| Update DTO | `src/business/dto/update-service.dto.ts` | Validation |
| Modifier DTO | `src/business/dto/price-modifier.dto.ts` | Validation |
| Unit Test | `src/business/service.service.spec.ts` | Service logic tests |
| E2E Test | `test/e2e/service.e2e-spec.ts` | Full HTTP tests |

**Total files: 8** (no new DB models — uses existing `Service` + `PriceModifier` tables)
