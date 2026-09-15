# Admin Feature: Reports & Audit Log

## Brief Description

Reports & Audit Log provides two critical admin capabilities:
1. **Reports** — Generate CSV exports of platform data (bookings, revenue, businesses) for a given date range. Reports are generated asynchronously via a background job and delivered as a presigned URL to Cloudflare R2.
2. **Audit Log** — View a chronological trail of all admin and financial mutations (user deactivation, business verification, booking cancellation, refund processing). This is the accountability layer — every admin action is traceable.

**Endpoints:**
- `GET /api/v1/admin/reports` — Generate report (async, returns jobId)
- `GET /api/v1/admin/reports/:jobId` — Check report status / get download URL
- `GET /api/v1/admin/audit` — View audit log entries

**Auth:** ADMIN only  
**Cost:** $0

---

## 1. What This Feature Does

### 1.1 Generate Report
Admin sends `GET /admin/reports?from=2026-09-01&to=2026-09-14&type=bookings&businessId=uuid`. Backend:
1. Validates date range.
2. Creates a `ReportJob` record (status=PENDING).
3. Enqueues a background job to generate the CSV.
4. Returns `jobId` immediately (admin doesn't wait).

### 1.2 Check Report Status
Admin sends `GET /admin/reports/:jobId`. Backend:
1. Returns job status (PENDING, PROCESSING, COMPLETED, FAILED).
2. If COMPLETED: includes presigned download URL (expires in 1 hour).

### 1.3 View Audit Log
Admin sends `GET /admin/audit?entity=USER&action=USER_DEACTIVATED&page=1`. Backend returns a paginated list of all audit entries with actor info, action, entity, and metadata.

---

## 2. API Contracts

### 2.1 Generate Report

```
GET /api/v1/admin/reports?from=2026-09-01&to=2026-09-14&type=bookings
Authorization: Bearer <admin-jwt>
```

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `from` | string | Yes | Start date (YYYY-MM-DD) |
| `to` | string | Yes | End date (YYYY-MM-DD) |
| `type` | string | Yes | Report type: `bookings`, `revenue`, `businesses`, `users` |
| `businessId` | uuid | No | Filter by specific business |

**Response:**

```json
{
  "success": true,
  "data": {
    "jobId": "uuid",
    "status": "PENDING",
    "message": "Report generation started. Check status with GET /admin/reports/:jobId"
  }
}
```

### 2.2 Check Report Status

```
GET /api/v1/admin/reports/:jobId
Authorization: Bearer <admin-jwt>
```

**Response (Pending):**

```json
{
  "success": true,
  "data": {
    "jobId": "uuid",
    "status": "PENDING",
    "createdAt": "2026-09-14T15:00:00Z"
  }
}
```

**Response (Completed):**

```json
{
  "success": true,
  "data": {
    "jobId": "uuid",
    "status": "COMPLETED",
    "downloadUrl": "https://r2.carwash.com/reports/bookings-2026-09-01-2026-09-14.csv?X-Amz-Signature=...",
    "expiresAt": "2026-09-14T16:00:00Z",
    "rowcount": 1542,
    "createdAt": "2026-09-14T15:00:00Z",
    "completedAt": "2026-09-14T15:00:35Z"
  }
}
```

**Response (Failed):**

```json
{
  "success": true,
  "data": {
    "jobId": "uuid",
    "status": "FAILED",
    "error": "Date range exceeds 90 days limit",
    "createdAt": "2026-09-14T15:00:00Z"
  }
}
```

### 2.3 View Audit Log

```
GET /api/v1/admin/audit?entity=USER&action=USER_DEACTIVATED&page=1&limit=50
Authorization: Bearer <admin-jwt>
```

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `entity` | string | — | Filter: `USER`, `BUSINESS`, `BOOKING`, `PAYMENT`, `REVIEW` |
| `action` | string | — | Filter by specific action |
| `actorId` | uuid | — | Filter by admin who performed action |
| `from` | string | — | Start date |
| `to` | string | — | End date |
| `page` | number | 1 | Page number |
| `limit` | number | 50 | Results per page |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "actorId": "uuid",
      "actorEmail": "admin@carwash.com",
      "action": "USER_DEACTIVATED",
      "entityType": "USER",
      "entityId": "uuid",
      "metadata": {
        "reason": "Violation of terms of service",
        "bookingsCancelled": 3
      },
      "createdAt": "2026-09-14T15:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 234,
    "totalPages": 5
  }
}
```

---

## 3. Data Model

### New Table: `ReportJob`

```prisma
model ReportJob {
  id          String     @id @default(uuid())
  adminId     String
  type        String     // "bookings", "revenue", "businesses", "users"
  status      ReportStatus @default(PENDING)
  filters     Json?      // { from, to, businessId }
  fileUrl     String?    // Presigned URL after completion
  rowcount    Int?
  error       String?
  createdAt   DateTime   @default(now())
  completedAt DateTime?

  @@index([adminId])
  @@index([status])
}

enum ReportStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}
```

### Existing Table: `AuditLog`

```prisma
model AuditLog {
  id         String   @id @default(uuid())
  actorId    String
  action     String   // "USER_DEACTIVATED", "BUSINESS_APPROVED", etc.
  entityType String   // "USER", "BUSINESS", "BOOKING", "PAYMENT", "REVIEW"
  entityId   String
  metadata   Json?    // Arbitrary context data
  createdAt  DateTime @default(now())

  @@index([actorId])
  @@index([entityType, entityId])
  @@index([action])
  @@index([createdAt])
}
```

---

## 4. Implementation Files

### 4.1 DTOs

**`admin/dto/generate-report.dto.ts`**

```typescript
import { IsString, IsOptional, IsIn, Matches, IsUUID } from 'class-validator';

export class GenerateReportDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to: string;

  @IsIn(['bookings', 'revenue', 'businesses', 'users'])
  type: string;

  @IsOptional()
  @IsUUID()
  businessId?: string;
}
```

**`admin/dto/audit-log.dto.ts`**

```typescript
import { IsOptional, IsString, IsInt, Min, Max, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class AuditLogDto {
  @IsOptional()
  @IsString()
  entity?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  actorId?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
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
  limit?: number = 50;
}
```

### 4.2 Controller

```typescript
import { Controller, Get, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../libs/common/guards/jwt-auth.guard';
import { RolesGuard } from '../libs/common/guards/roles.guard';
import { Roles } from '../libs/common/decorators/roles.decorator';
import { CurrentUser } from '../libs/common/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import { AuditLogDto } from './dto/audit-log.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('reports')
  async generateReport(
    @Query() query: GenerateReportDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.generateReport(query, adminId);
  }

  @Get('reports/:jobId')
  async getReportStatus(@Param('jobId', ParseUUIDPipe) jobId: string) {
    return this.adminService.getReportStatus(jobId);
  }

  @Get('audit')
  async getAuditLog(@Query() query: AuditLogDto) {
    return this.adminService.getAuditLog(query);
  }
}
```

### 4.3 Service

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { QueueService } from '../libs/queue/queue.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import { AuditLogDto } from './dto/audit-log.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  async generateReport(dto: GenerateReportDto, adminId: string) {
    const { from, to, type, businessId } = dto;

    // Validate date range (max 90 days)
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const diffDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 90) {
      throw new BadRequestException('Date range cannot exceed 90 days');
    }
    if (diffDays < 0) {
      throw new BadRequestException('End date must be after start date');
    }

    // Create report job
    const job = await this.prisma.reportJob.create({
      data: {
        adminId,
        type,
        status: 'PENDING',
        filters: { from, to, businessId },
      },
    });

    // Enqueue background job (worker generates CSV + uploads to R2)
    await this.queue.enqueue('reports', {
      jobId: job.id,
      type,
      filters: { from, to, businessId },
    });

    return {
      data: {
        jobId: job.id,
        status: 'PENDING',
        message: 'Report generation started. Check status with GET /admin/reports/:jobId',
      },
    };
  }

  async getReportStatus(jobId: string) {
    const job = await this.prisma.reportJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Report job not found');

    return {
      data: {
        jobId: job.id,
        status: job.status,
        downloadUrl: job.fileUrl,
        expiresAt: job.fileUrl ? new Date(Date.now() + 60 * 60 * 1000) : null,
        rowcount: job.rowcount,
        error: job.error,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      },
    };
  }

  async getAuditLog(dto: AuditLogDto) {
    const { entity, action, actorId, from, to, page, limit } = dto;

    const where: any = {};
    if (entity) where.entityType = entity;
    if (action) where.action = action;
    if (actorId) where.actorId = actorId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [entries, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          // If AuditLog has actor relation:
          // actor: { select: { email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: entries,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
```

### 4.4 Worker — Report Generation Processor

**`worker/processors/report-export.processor.ts`**

```typescript
import { Processor, Process } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../libs/prisma/prisma.service';
import { R2Service } from '../../libs/r2/r2.service';

@Processor('reports')
export class ReportExportProcessor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
  ) {}

  @Process()
  async handleReport(job: Job) {
    const { jobId, type, filters } = job.data;

    // 1. Update status to PROCESSING
    await this.prisma.reportJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING' },
    });

    try {
      // 2. Query data based on report type
      const data = await this.getReportData(type, filters);

      // 3. Generate CSV
      const csv = this.toCSV(data, type);

      // 4. Upload to Cloudflare R2
      const filename = `reports/${type}-${filters.from}-${filters.to}.csv`;
      const url = await this.r2.upload(filename, csv, 'text/csv');

      // 5. Update job as COMPLETED
      await this.prisma.reportJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          fileUrl: url,
          rowcount: data.length,
          completedAt: new Date(),
        },
      });

      return { success: true };
    } catch (error) {
      // 6. Update job as FAILED
      await this.prisma.reportJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          error: error.message,
        },
      });
      throw error;
    }
  }

  private async getReportData(type: string, filters: any) {
    const { from, to, businessId } = filters;
    const where = {
      createdAt: { gte: new Date(from), lte: new Date(to) },
      ...(businessId && { businessId }),
    };

    switch (type) {
      case 'bookings':
        return this.prisma.booking.findMany({
          where,
          include: {
            customer: { select: { firstName: true, lastName: true } },
            business: { select: { name: true } },
            service: { select: { name: true } },
          },
        });

      case 'revenue':
        return this.prisma.payment.findMany({
          where: { ...where, status: 'COMPLETED' },
          include: {
            booking: {
              include: {
                business: { select: { name: true } },
                service: { select: { name: true } },
              },
            },
          },
        });

      case 'businesses':
        return this.prisma.business.findMany({
          where: { createdAt: where.createdAt },
          include: {
            _count: { select: { bookings: true, reviews: true } },
          },
        });

      case 'users':
        return this.prisma.user.findMany({
          where: { createdAt: where.createdAt },
          include: {
            customer: { select: { firstName: true, lastName: true } },
            business: { select: { name: true } },
          },
        });

      default:
        throw new Error(`Unknown report type: ${type}`);
    }
  }

  private toCSV(data: any[], type: string): string {
    if (data.length === 0) return '';

    // Simple CSV generation — no external library needed
    const headers = Object.keys(data[0]).filter((k) => !k.startsWith('_'));
    const rows = data.map((row) =>
      headers.map((h) => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val).replace(/"/g, '""');
      }).join(','),
    );

    return [headers.join(','), ...rows].join('\n');
  }
}
```

### 4.5 R2 Service (Cloudflare R2 — Free Tier)

**`libs/r2/r2.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class R2Service {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
    this.bucket = process.env.R2_BUCKET_NAME;
  }

  async upload(key: string, body: string, contentType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );

    // Generate presigned URL (expires in 1 hour)
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn: 3600 });
  }
}
```

**Cost note:** Cloudflare R2 free tier: 10GB storage, 10K Class A ops/month. A few CSV reports per day = negligible usage.

---

## 5. Report Types

| Type | Data Included | CSV Columns |
|------|--------------|-------------|
| `bookings` | All bookings in date range | ID, Date, Customer, Business, Service, Status, Amount |
| `revenue` | Completed payments | Date, Business, Service, Amount, Payment Method |
| `businesses` | All businesses | Name, City, Verified, Rating, Bookings, Reviews |
| `users` | All users | Email, Role, Active, Joined, Last Login |

---

## 6. Audit Log Actions

| Action | Entity | Triggered By |
|--------|--------|-------------|
| `USER_DEACTIVATED` | USER | Admin deactivates user |
| `USER_ACTIVATED` | USER | Admin reactivates user |
| `BUSINESS_APPROVED` | BUSINESS | Admin verifies business |
| `BUSINESS_REJECTED` | BUSINESS | Admin rejects business |
| `BUSINESS_DEACTIVATED` | BUSINESS | Admin deactivates business |
| `BOOKING_CANCELLED_BY_ADMIN` | BOOKING | Admin cancels booking |
| `REFUND_PROCESSED` | PAYMENT | Admin processes refund |
| `REVIEW_HIDDEN` | REVIEW | Admin hides review |
| `REVIEW_UNHIDDEN` | REVIEW | Admin unhides review |

---

## 7. Testing

### Unit Tests

```typescript
describe('AdminService', () => {
  describe('generateReport', () => {
    it('should create job and enqueue worker', async () => { ... });
    it('should reject date range > 90 days', async () => { ... });
  });

  describe('getAuditLog', () => {
    it('should filter by entity type', async () => { ... });
    it('should filter by action', async () => { ... });
    it('should paginate results', async () => { ... });
  });
});
```

### E2E Tests

```typescript
describe('Admin Reports & Audit (e2e)', () => {
  it('GET /admin/reports creates report job', () => { ... });
  it('GET /admin/reports/:jobId returns status', () => { ... });
  it('GET /admin/audit lists audit entries', () => { ... });
  it('GET /admin/audit?entity=USER filters correctly', () => { ... });
  it('returns 403 for non-admin users', () => { ... });
});
```

---

## 8. File Summary

| File | Path | Purpose |
|------|------|---------|
| Controller | `src/admin/admin.controller.ts` | Route handlers for reports + audit |
| Service | `src/admin/admin.service.ts` | Business logic, DB queries |
| Module | `src/admin/admin.module.ts` | NestJS module wiring |
| DTO (report) | `src/admin/dto/generate-report.dto.ts` | Report query validation |
| DTO (audit) | `src/admin/dto/audit-log.dto.ts` | Audit query validation |
| Worker | `worker/processors/report-export.processor.ts` | Background CSV generation |
| R2 Service | `src/libs/r2/r2.service.ts` | Cloudflare R2 upload |
| Unit Test | `test/unit/admin.service.spec.ts` | Service logic tests |
| E2E Test | `test/e2e/admin.e2e-spec.ts` | Full HTTP tests |

**Total files: 9** (2 new DB models: `ReportJob`, `AuditLog`)
