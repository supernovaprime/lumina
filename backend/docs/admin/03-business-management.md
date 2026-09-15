# Admin Feature: Business Management

## Brief Description

Business Management allows admins to review, verify, and manage car-wash businesses on the platform. When a business owner creates a profile, it enters a PENDING state. An admin must APPROVE or REJECT it before it appears in public search results. Admins can also deactivate businesses that violate platform rules. This is the quality gatekeeper for the marketplace.

**Endpoints:**
- `GET /api/v1/admin/businesses` — List all businesses (filterable by status)
- `GET /api/v1/admin/businesses/:id` — Get business detail
- `PUT /api/v1/admin/businesses/:id/verify` — APPROVE or REJECT a business
- `PUT /api/v1/admin/businesses/:id/deactivate` — Deactivate a business

**Auth:** ADMIN only  
**Cost:** $0

---

## 1. What This Feature Does

### 1.1 List Businesses
Admin sends `GET /admin/businesses?status=PENDING&page=1`. Backend returns a paginated list of businesses, filterable by verification status (PENDING, APPROVED, REJECTED) or active status.

### 1.2 Get Business Detail
Admin sends `GET /admin/businesses/:id`. Backend returns full business profile including owner info, services count, booking count, and current verification status.

### 1.3 Verify Business (APPROVE/REJECT)
Admin sends `PUT /admin/businesses/:id/verify { action: 'APPROVE' | 'REJECT', reason?: string }`. Backend:
1. Validates business is in PENDING state.
2. If APPROVE: sets `isVerified=true`, `verificationStatus=APPROVED`, `verifiedAt=now`, `verifiedBy=adminId`.
3. If REJECT: sets `verificationStatus=REJECTED`, `rejectionReason=reason`.
4. Sends email notification to business owner.
5. Writes audit log.

### 1.4 Deactivate Business
Admin sends `PUT /admin/businesses/:id/deactivate`. Backend:
1. Sets `Business.isActive=false`.
2. Business disappears from public search.
3. Future bookings are NOT auto-cancelled (owner must handle).
4. Sends email notification.
5. Writes audit log.

---

## 2. API Contracts

### 2.1 List Businesses

```
GET /api/v1/admin/businesses?status=PENDING&q=wash&page=1&limit=20
Authorization: Bearer <admin-jwt>
```

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | string | — | Filter: `PENDING`, `APPROVED`, `REJECTED` |
| `isActive` | boolean | — | Filter by active status |
| `q` | string | — | Search by name or city |
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Results per page (max 100) |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Quick Wash Pro",
      "city": "Accra",
      "state": "Greater Accra",
      "phone": "+233201234567",
      "email": "info@quickwash.com",
      "isVerified": false,
      "isActive": true,
      "verificationStatus": "PENDING",
      "rating": 0,
      "reviewCount": 0,
      "serviceCount": 5,
      "bookingCount": 0,
      "owner": {
        "id": "uuid",
        "email": "owner@quickwash.com",
        "firstName": "Kwame",
        "lastName": "Asante"
      },
      "createdAt": "2026-09-14T10:00:00Z"
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

### 2.2 Get Business Detail

```
GET /api/v1/admin/businesses/:id
Authorization: Bearer <admin-jwt>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Quick Wash Pro",
    "description": "Premium car wash services in Accra",
    "address": "123 Oxford Street",
    "city": "Accra",
    "state": "Greater Accra",
    "zipCode": "00233",
    "latitude": 5.6037,
    "longitude": -0.1870,
    "phone": "+233201234567",
    "email": "info@quickwash.com",
    "logo": "https://r2.carwash.com/logos/quickwash.png",
    "coverImage": null,
    "isVerified": false,
    "isActive": true,
    "verificationStatus": "PENDING",
    "verifiedAt": null,
    "verifiedBy": null,
    "rejectionReason": null,
    "rating": 0,
    "reviewCount": 0,
    "timezone": "Africa/Accra",
    "operatingHours": {
      "timezone": "Africa/Accra",
      "weekly": {
        "mon": [["08:00", "18:00"]],
        "tue": [["08:00", "18:00"]],
        "wed": [["08:00", "18:00"]],
        "thu": [["08:00", "18:00"]],
        "fri": [["08:00", "18:00"]],
        "sat": [["09:00", "14:00"]],
        "sun": []
      },
      "exceptions": []
    },
    "owner": {
      "id": "uuid",
      "email": "owner@quickwash.com",
      "firstName": "Kwame",
      "lastName": "Asante",
      "phone": "+233209876543",
      "createdAt": "2026-09-10T08:00:00Z"
    },
    "services": [
      { "id": "uuid", "name": "Basic Wash", "category": "EXTERIOR", "basePrice": 3000, "isActive": true },
      { "id": "uuid", "name": "Full Detail", "category": "DETAILING", "basePrice": 15000, "isActive": true }
    ],
    "stats": {
      "totalBookings": 0,
      "completedBookings": 0,
      "totalRevenue": 0,
      "averageRating": 0
    },
    "createdAt": "2026-09-14T10:00:00Z",
    "updatedAt": "2026-09-14T10:00:00Z"
  }
}
```

### 2.3 Verify Business

```
PUT /api/v1/admin/businesses/:id/verify
Authorization: Bearer <admin-jwt>
```

**Request Body (APPROVE):**

```json
{
  "action": "APPROVE"
}
```

**Request Body (REJECT):**

```json
{
  "action": "REJECT",
  "reason": "Business address does not match verification documents"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "verificationStatus": "APPROVED",
    "isVerified": true,
    "verifiedAt": "2026-09-14T12:00:00Z",
    "message": "Business approved successfully"
  }
}
```

### 2.4 Deactivate Business

```
PUT /api/v1/admin/businesses/:id/deactivate
Authorization: Bearer <admin-jwt>
```

**Request Body (optional):**

```json
{
  "reason": "Repeated customer complaints"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "isActive": false,
    "message": "Business deactivated successfully"
  }
}
```

---

## 3. Data Model

No new tables. Reads/writes to existing tables:

| Table | Operation |
|-------|-----------|
| `Business` | Read, update `isVerified`, `verificationStatus`, `verifiedAt`, `verifiedBy`, `isActive` |
| `User` | Read (owner info) |
| `Service` | Read (count) |
| `Booking` | Read (count) |
| `AuditLog` | Insert (on verify/deactivate) |

---

## 4. Implementation Files

### 4.1 DTOs

**`admin/dto/list-businesses.dto.ts`**

```typescript
import { IsOptional, IsIn, IsString, IsInt, Min, Max, IsBooleanString } from 'class-validator';
import { Type } from 'class-transformer';

export class ListBusinessesDto {
  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  status?: string;

  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @IsOptional()
  @IsString()
  q?: string;

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

**`admin/dto/verify-business.dto.ts`**

```typescript
import { IsIn, IsString, MaxLength, ValidateIf } from 'class-validator';

export class VerifyBusinessDto {
  @IsIn(['APPROVE', 'REJECT'])
  action: 'APPROVE' | 'REJECT';

  @ValidateIf((o) => o.action === 'REJECT')
  @IsString()
  @MaxLength(500)
  reason?: string;
}
```

**`admin/dto/deactivate-business.dto.ts`**

```typescript
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DeactivateBusinessDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
```

### 4.2 Controller

```typescript
import { Controller, Get, Put, Param, Query, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../libs/common/guards/jwt-auth.guard';
import { RolesGuard } from '../libs/common/guards/roles.guard';
import { Roles } from '../libs/common/decorators/roles.decorator';
import { CurrentUser } from '../libs/common/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import { ListBusinessesDto } from './dto/list-businesses.dto';
import { VerifyBusinessDto } from './dto/verify-business.dto';
import { DeactivateBusinessDto } from './dto/deactivate-business.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('businesses')
  async listBusinesses(@Query() query: ListBusinessesDto) {
    return this.adminService.listBusinesses(query);
  }

  @Get('businesses/:id')
  async getBusiness(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getBusinessDetail(id);
  }

  @Put('businesses/:id/verify')
  async verifyBusiness(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: VerifyBusinessDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.verifyBusiness(id, body, adminId);
  }

  @Put('businesses/:id/deactivate')
  async deactivateBusiness(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: DeactivateBusinessDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.deactivateBusiness(id, body.reason, adminId);
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
import { ListBusinessesDto } from './dto/list-businesses.dto';
import { VerifyBusinessDto } from './dto/verify-business.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
    private readonly cache: CacheService,
  ) {}

  async listBusinesses(dto: ListBusinessesDto) {
    const { status, isActive, q, page, limit } = dto;

    const where: any = {};
    if (status) where.verificationStatus = status;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [businesses, total] = await Promise.all([
      this.prisma.business.findMany({
        where,
        include: {
          owner: { select: { id: true, email: true, firstName: true, lastName: true } },
          _count: { select: { services: true, bookings: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.business.count({ where }),
    ]);

    return {
      data: businesses.map((b) => ({
        id: b.id,
        name: b.name,
        city: b.city,
        state: b.state,
        phone: b.phone,
        email: b.email,
        isVerified: b.isVerified,
        isActive: b.isActive,
        verificationStatus: b.verificationStatus,
        rating: b.rating,
        reviewCount: b.reviewCount,
        serviceCount: b._count.services,
        bookingCount: b._count.bookings,
        owner: b.owner,
        createdAt: b.createdAt,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getBusinessDetail(id: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, email: true, firstName: true, lastName: true, phone: true, createdAt: true },
        },
        services: { select: { id: true, name: true, category: true, basePrice: true, isActive: true } },
        _count: { select: { bookings: true } },
      },
    });

    if (!business) throw new NotFoundException('Business not found');

    // Get aggregated stats
    const [completedBookings, revenueResult] = await Promise.all([
      this.prisma.booking.count({
        where: { businessId: id, status: 'COMPLETED' },
      }),
      this.prisma.payment.aggregate({
        where: { booking: { businessId: id }, status: 'COMPLETED' },
        _sum: { amount: true },
      }),
    ]);

    return {
      data: {
        ...business,
        stats: {
          totalBookings: business._count.bookings,
          completedBookings,
          totalRevenue: revenueResult._sum.amount || 0,
          averageRating: business.rating,
        },
      },
    };
  }

  async verifyBusiness(id: string, dto: VerifyBusinessDto, adminId: string) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException('Business not found');
    if (business.verificationStatus !== 'PENDING') {
      throw new ConflictException(`Business is already ${business.verificationStatus.toLowerCase()}`);
    }

    const updateData: any = {
      verificationStatus: dto.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
    };

    if (dto.action === 'APPROVE') {
      updateData.isVerified = true;
      updateData.verifiedAt = new Date();
      updateData.verifiedBy = adminId;
    } else {
      updateData.rejectionReason = dto.reason;
    }

    await this.prisma.business.update({ where: { id }, data: updateData });

    // Audit log
    await this.audit.write({
      actorId: adminId,
      action: dto.action === 'APPROVE' ? 'BUSINESS_APPROVED' : 'BUSINESS_REJECTED',
      entityType: 'BUSINESS',
      entityId: id,
      metadata: { reason: dto.reason },
    });

    // Invalidate business cache + search cache
    await this.cache.invalidate(`business:${id}`);
    await this.cache.invalidate('search:*');

    // Send email notification
    const template = dto.action === 'APPROVE' ? 'business-approved' : 'business-rejected';
    await this.email.send({
      to: business.email,
      template,
      data: { businessName: business.name, reason: dto.reason },
    });

    return {
      data: {
        id,
        verificationStatus: updateData.verificationStatus,
        isVerified: updateData.isVerified || false,
        verifiedAt: updateData.verifiedAt || null,
        message: `Business ${dto.action === 'APPROVE' ? 'approved' : 'rejected'} successfully`,
      },
    };
  }

  async deactivateBusiness(id: string, reason: string | undefined, adminId: string) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException('Business not found');
    if (!business.isActive) throw new ConflictException('Business is already inactive');

    await this.prisma.business.update({
      where: { id },
      data: { isActive: false },
    });

    // Audit log
    await this.audit.write({
      actorId: adminId,
      action: 'BUSINESS_DEACTIVATED',
      entityType: 'BUSINESS',
      entityId: id,
      metadata: { reason },
    });

    // Invalidate caches
    await this.cache.invalidate(`business:${id}`);
    await this.cache.invalidate('search:*');

    // Send email notification
    await this.email.send({
      to: business.email,
      template: 'business-deactivated',
      data: { businessName: business.name, reason: reason || 'No reason provided' },
    });

    return {
      data: { id, isActive: false, message: 'Business deactivated successfully' },
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

## 5. Verification Workflow

```
Business Owner                    Admin                         Platform
     │                             │                              │
     │  POST /businesses           │                              │
     │  (creates profile)          │                              │
     │────────────────────────────>│                              │
     │                             │  verificationStatus=PENDING  │
     │                             │  isVerified=false            │
     │                             │                              │
     │  Email: "Pending review"    │                              │
     │<────────────────────────────│                              │
     │                             │                              │
     │                             │  GET /admin/businesses       │
     │                             │  ?status=PENDING             │
     │                             │─────────────────────────────>│
     │                             │                              │
     │                             │  PUT /admin/businesses/:id   │
     │                             │  /verify { action: APPROVE } │
     │                             │─────────────────────────────>│
     │                             │                              │
     │                             │  isVerified=true             │
     │                             │  verificationStatus=APPROVED │
     │                             │  verifiedAt=now              │
     │                             │                              │
     │  Email: "Business approved" │                              │
     │<────────────────────────────│                              │
     │                             │                              │
     │                             │  Business appears in search  │
     │                             │─────────────────────────────>│
```

---

## 6. Cache Invalidation

| Event | Cache Keys Invalidated |
|-------|----------------------|
| Business verified | `business:{id}`, `search:*` |
| Business rejected | `business:{id}`, `search:*` |
| Business deactivated | `business:{id}`, `search:*` |
| Business updated (by owner) | `business:{id}`, `search:*` |

---

## 7. Testing

### Unit Tests

```typescript
describe('AdminService', () => {
  describe('verifyBusiness', () => {
    it('should APPROVE a PENDING business', async () => { ... });
    it('should REJECT a PENDING business with reason', async () => { ... });
    it('should throw ConflictException if already APPROVED', async () => { ... });
    it('should throw NotFoundException for non-existent business', async () => { ... });
  });

  describe('deactivateBusiness', () => {
    it('should deactivate and invalidate cache', async () => { ... });
    it('should throw ConflictException if already inactive', async () => { ... });
  });
});
```

### E2E Tests

```typescript
describe('Admin Business Management (e2e)', () => {
  it('GET /admin/businesses lists all businesses', () => { ... });
  it('GET /admin/businesses?status=PENDING filters correctly', () => { ... });
  it('PUT /admin/businesses/:id/verify APPROVE works', () => { ... });
  it('PUT /admin/businesses/:id/verify REJECT requires reason', () => { ... });
  it('PUT /admin/businesses/:id/deactivate works', () => { ... });
  it('returns 403 for non-admin users', () => { ... });
});
```

---

## 8. File Summary

| File | Path | Purpose |
|------|------|---------|
| Controller | `src/admin/admin.controller.ts` | Route handlers for business mgmt |
| Service | `src/admin/admin.service.ts` | Business logic, DB queries |
| Module | `src/admin/admin.module.ts` | NestJS module wiring |
| DTO (list) | `src/admin/dto/list-businesses.dto.ts` | Query param validation |
| DTO (verify) | `src/admin/dto/verify-business.dto.ts` | Verify action validation |
| DTO (deactivate) | `src/admin/dto/deactivate-business.dto.ts` | Deactivate body validation |
| Unit Test | `test/unit/admin.service.spec.ts` | Service logic tests |
| E2E Test | `test/e2e/admin.e2e-spec.ts` | Full HTTP tests |

**Total files: 8** (no new DB models)
