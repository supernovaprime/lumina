# Admin Feature: User Management

## Brief Description

User Management allows admins to view, search, activate, and deactivate platform users. When a user is deactivated, all their sessions are revoked (via `tokenVersion++`), and any future bookings they have as a customer are cancelled per policy. This is the admin's tool for handling problematic accounts, enforcing platform rules, and maintaining user quality.

**Endpoints:**
- `GET /api/v1/admin/users` — List users (paginated, filterable)
- `GET /api/v1/admin/users/:id` — Get user detail
- `PUT /api/v1/admin/users/:id/activate` — Reactivate account
- `PUT /api/v1/admin/users/:id/deactivate` — Deactivate account

**Auth:** ADMIN only  
**Cost:** $0

---

## 1. What This Feature Does

### 1.1 List Users
Admin sends `GET /admin/users?role=CUSTOMER&q=john&page=1&limit=20`. Backend returns a paginated list of users matching the filters. PII (emails, phones) are masked in logs but returned in the response (admin needs them).

### 1.2 Get User Detail
Admin sends `GET /admin/users/:id`. Backend returns full user profile including role-specific data (customer profile + vehicle count, or business profile + service count).

### 1.3 Activate User
Admin sends `PUT /admin/users/:id/activate`. Backend:
1. Sets `User.isActive = true`.
2. Returns success.

### 1.4 Deactivate User
Admin sends `PUT /admin/users/:id/deactivate`. Backend:
1. Sets `User.isActive = false`.
2. Increments `User.tokenVersion` (revokes all active sessions).
3. If user is a CUSTOMER: cancels all future CONFIRMED/PENDING bookings (policy).
4. If user is a BUSINESS: deactivates their business (hides from search).
5. Writes audit log entry.
6. Sends deactivation notification email.

---

## 2. API Contracts

### 2.1 List Users

```
GET /api/v1/admin/users?role=CUSTOMER&q=john&page=1&limit=20
Authorization: Bearer <admin-jwt>
```

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `role` | string | — | Filter by role: `CUSTOMER`, `BUSINESS`, `ADMIN` |
| `q` | string | — | Search by email or name (partial match) |
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Results per page (max 100) |
| `sortBy` | string | `createdAt` | Sort field |
| `sortOrder` | string | `desc` | `asc` or `desc` |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "john@example.com",
      "role": "CUSTOMER",
      "isActive": true,
      "emailVerified": "2026-09-01T10:00:00Z",
      "lastLoginAt": "2026-09-14T08:30:00Z",
      "createdAt": "2026-08-15T12:00:00Z",
      "customer": {
        "firstName": "John",
        "lastName": "Doe",
        "phone": "+1234567890",
        "vehicleCount": 2,
        "bookingCount": 5
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 3240,
    "totalPages": 162
  }
}
```

### 2.2 Get User Detail

```
GET /api/v1/admin/users/:id
Authorization: Bearer <admin-jwt>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "john@example.com",
    "role": "CUSTOMER",
    "isActive": true,
    "emailVerified": "2026-09-01T10:00:00Z",
    "lastLoginAt": "2026-09-14T08:30:00Z",
    "createdAt": "2026-08-15T12:00:00Z",
    "customer": {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890",
      "vehicles": [
        { "id": "uuid", "make": "Toyota", "model": "Camry", "year": 2022, "type": "SEDAN" }
      ],
      "recentBookings": [
        { "id": "uuid", "status": "COMPLETED", "date": "2026-09-10", "totalPrice": 4500 }
      ],
      "reviewCount": 3,
      "favoriteCount": 2
    }
  }
}
```

### 2.3 Activate User

```
PUT /api/v1/admin/users/:id/activate
Authorization: Bearer <admin-jwt>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "isActive": true,
    "message": "User activated successfully"
  }
}
```

### 2.4 Deactivate User

```
PUT /api/v1/admin/users/:id/deactivate
Authorization: Bearer <admin-jwt>
```

**Request Body (optional):**

```json
{
  "reason": "Violation of terms of service"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "isActive": false,
    "sessionsRevoked": true,
    "bookingsCancelled": 3,
    "message": "User deactivated successfully"
  }
}
```

---

## 3. Data Model

No new tables. Reads/writes to existing tables:

| Table | Operation |
|-------|-----------|
| `User` | Read, update `isActive`, increment `tokenVersion` |
| `Customer` | Read (profile data) |
| `Business` | Update `isActive` (on user deactivation) |
| `Booking` | Read + update status to `CANCELLED` (on customer deactivation) |
| `RefreshToken` | Delete all for user (session revocation) |
| `AuditLog` | Insert (on deactivation) |

---

## 4. Implementation Files

### 4.1 DTOs

**`admin/dto/list-users.dto.ts`**

```typescript
import { IsOptional, IsIn, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ListUsersDto {
  @IsOptional()
  @IsIn(['CUSTOMER', 'BUSINESS', 'ADMIN'])
  role?: string;

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

  @IsOptional()
  @IsIn(['createdAt', 'email', 'lastLoginAt'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
```

**`admin/dto/deactivate-user.dto.ts`**

```typescript
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DeactivateUserDto {
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
import { AdminService } from './admin.service';
import { ListUsersDto } from './dto/list-users.dto';
import { DeactivateUserDto } from './dto/deactivate-user.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  async listUsers(@Query() query: ListUsersDto) {
    return this.adminService.listUsers(query);
  }

  @Get('users/:id')
  async getUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Put('users/:id/activate')
  async activateUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.activateUser(id);
  }

  @Put('users/:id/deactivate')
  async deactivateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: DeactivateUserDto,
  ) {
    return this.adminService.deactivateUser(id, body.reason);
  }
}
```

### 4.3 Service

```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { AuditService } from '../libs/audit/audit.service';
import { EmailService } from '../libs/email/email.service';
import { ListUsersDto } from './dto/list-users.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
  ) {}

  async listUsers(dto: ListUsersDto) {
    const { role, q, page, limit, sortBy, sortOrder } = dto;

    const where: any = {};
    if (role) where.role = role;
    if (q) {
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { customer: { firstName: { contains: q, mode: 'insensitive' } } },
        { customer: { lastName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          customer: {
            include: {
              _count: { select: { vehicles: true, bookings: true } },
            },
          },
          business: {
            include: {
              _count: { select: { services: true, bookings: true } },
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((u) => this.formatUser(u)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        customer: {
          include: {
            vehicles: true,
            bookings: { orderBy: { createdAt: 'desc' }, take: 10 },
            _count: { select: { reviews: true, favorites: true } },
          },
        },
        business: {
          include: {
            services: true,
            _count: { select: { bookings: true, reviews: true } },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return { data: this.formatUserDetail(user) };
  }

  async activateUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.isActive) throw new ConflictException('User is already active');

    await this.prisma.user.update({
      where: { id },
      data: { isActive: true },
    });

    await this.audit.write({
      actorId: id, // admin who performed action (from JWT)
      action: 'USER_ACTIVATED',
      entityType: 'USER',
      entityId: id,
    });

    return { data: { id, isActive: true, message: 'User activated successfully' } };
  }

  async deactivateUser(id: string, reason?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { customer: true, business: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (!user.isActive) throw new ConflictException('User is already inactive');

    // Transaction: revoke sessions + deactivate + cancel bookings
    await this.prisma.$transaction(async (tx) => {
      // 1. Revoke all sessions (tokenVersion++)
      await tx.user.update({
        where: { id },
        data: {
          isActive: false,
          tokenVersion: { increment: 1 },
        },
      });

      // 2. Delete all refresh tokens (force logout)
      await tx.refreshToken.deleteMany({ where: { userId: id } });

      // 3. If customer: cancel future bookings
      let bookingsCancelled = 0;
      if (user.customer) {
        const result = await tx.booking.updateMany({
          where: {
            customerId: user.customer.id,
            status: { in: ['PENDING', 'CONFIRMED'] },
            date: { gte: new Date() },
          },
          data: {
            status: 'CANCELLED',
            cancelReason: reason || 'Account deactivated by admin',
            cancelledBy: 'ADMIN',
          },
        });
        bookingsCancelled = result.count;
      }

      // 4. If business: deactivate business
      if (user.business) {
        await tx.business.update({
          where: { id: user.business.id },
          data: { isActive: false },
        });
      }

      // 5. Audit log
      await tx.auditLog.create({
        data: {
          actorId: id,
          action: 'USER_DEACTIVATED',
          entityType: 'USER',
          entityId: id,
          metadata: { reason, bookingsCancelled },
        },
      });

      return { bookingsCancelled };
    });

    // 6. Send notification email (async, non-blocking)
    await this.email.send({
      to: user.email,
      template: 'account-deactivated',
      data: { reason: reason || 'No reason provided' },
    });

    return {
      data: {
        id,
        isActive: false,
        sessionsRevoked: true,
        message: 'User deactivated successfully',
      },
    };
  }

  private formatUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      customer: user.customer
        ? {
            firstName: user.customer.firstName,
            lastName: user.customer.lastName,
            phone: user.customer.phone,
            vehicleCount: user.customer._count.vehicles,
            bookingCount: user.customer._count.bookings,
          }
        : null,
      business: user.business
        ? {
            name: user.business.name,
            serviceCount: user.business._count.services,
            bookingCount: user.business._count.bookings,
          }
        : null,
    };
  }

  private formatUserDetail(user: any) {
    return {
      ...this.formatUser(user),
      customer: user.customer
        ? {
            ...this.formatUser(user).customer,
            vehicles: user.customer.vehicles,
            recentBookings: user.customer.bookings,
            reviewCount: user.customer._count.reviews,
            favoriteCount: user.customer._count.favorites,
          }
        : null,
      business: user.business
        ? {
            ...this.formatUser(user).business,
            services: user.business.services,
            reviewCount: user.business._count.reviews,
          }
        : null,
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

## 5. Concurrency & Safety

| Concern | Solution |
|---------|----------|
| Double deactivation | `if (!user.isActive) throw ConflictException` |
| Admin deactivating themselves | Block: `if (id === adminId) throw ConflictException` |
| Race condition on tokenVersion | `increment: 1` is atomic in Prisma/PostgreSQL |
| Bookings cancelled in transaction | `$transaction` ensures all-or-nothing |
| Session revocation | Delete refresh tokens + increment tokenVersion |

---

## 6. Testing

### Unit Tests — `admin.service.spec.ts`

```typescript
describe('AdminService', () => {
  describe('listUsers', () => {
    it('should filter by role', async () => { ... });
    it('should search by email or name', async () => { ... });
    it('should paginate results', async () => { ... });
  });

  describe('deactivateUser', () => {
    it('should revoke sessions and cancel future bookings', async () => { ... });
    it('should deactivate business if user is business owner', async () => { ... });
    it('should throw NotFoundException for non-existent user', async () => { ... });
    it('should throw ConflictException if already inactive', async () => { ... });
  });

  describe('activateUser', () => {
    it('should set isActive to true', async () => { ... });
    it('should throw ConflictException if already active', async () => { ... });
  });
});
```

### E2E Tests — `admin.e2e-spec.ts`

```typescript
describe('Admin User Management (e2e)', () => {
  it('GET /admin/users returns paginated list', () => { ... });
  it('GET /admin/users?role=CUSTOMER filters correctly', () => { ... });
  it('GET /admin/users/:id returns user detail', () => { ... });
  it('PUT /admin/users/:id/deactivate revokes sessions', () => { ... });
  it('PUT /admin/users/:id/activate reactivates user', () => { ... });
  it('returns 403 for non-admin users', () => { ... });
});
```

---

## 7. File Summary

| File | Path | Purpose |
|------|------|---------|
| Controller | `src/admin/admin.controller.ts` | Route handlers for user mgmt endpoints |
| Service | `src/admin/admin.service.ts` | Business logic, DB queries |
| Module | `src/admin/admin.module.ts` | NestJS module wiring |
| DTO (list) | `src/admin/dto/list-users.dto.ts` | Query param validation |
| DTO (deactivate) | `src/admin/dto/deactivate-user.dto.ts` | Request body validation |
| Unit Test | `test/unit/admin.service.spec.ts` | Service logic tests |
| E2E Test | `test/e2e/admin.e2e-spec.ts` | Full HTTP tests |

**Total files: 7** (no new DB models)
