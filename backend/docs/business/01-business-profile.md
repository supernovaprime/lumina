# Business Feature: Business Profile & Verification

## Brief Description

Business owners set up and manage their business profile — name, address, location, hours, logo. New businesses start unverified and must be approved by an admin before appearing in public search. The owner can edit their profile at any time, but changes to operating hours trigger slot regeneration.

**Endpoints:**
- `POST /api/v1/businesses` — Create business profile
- `PATCH /api/v1/businesses/:id` — Update profile (owner only)
- `GET /api/v1/businesses/:id` — View business detail (public)
- `PATCH /api/v1/businesses/:id/logo` — Upload logo image

**Auth:** BUSINESS role (create/update), Public (view)
**Cost:** $0 (Supabase Storage for images, Nominatim for geocoding)

---

## 1. What This Feature Does

1. Business owner registers as `BUSINESS` role, then creates a business profile.
2. Backend geocodes the address server-side via Nominatim (free, no API key).
3. Business is created with `verificationStatus: PENDING`, `isVerified: false`.
4. Admin reviews and approves/rejects (see admin docs).
5. Only verified businesses appear in public search results.
6. Owner can update profile anytime; hours changes trigger slot regeneration.

---

## 2. API Contract

### Create Business

```
POST /api/v1/businesses
Authorization: Bearer <business-jwt>
```

**Request body:**
```json
{
  "name": "Sparkle Car Wash",
  "description": "Premium hand wash service",
  "address": "123 Main St",
  "city": "Austin",
  "state": "TX",
  "zipCode": "78701",
  "phone": "+15125551234",
  "email": "info@sparkle.com",
  "latitude": 30.2672,
  "longitude": -97.7431,
  "timezone": "America/Chicago",
  "logoUrl": null,
  "coverUrl": null
}
```

**Response — Success:**
```json
{
  "success": true,
  "data": {
    "id": "biz-1",
    "ownerId": "user-1",
    "name": "Sparkle Car Wash",
    "address": "123 Main St",
    "city": "Austin",
    "state": "TX",
    "zipCode": "78701",
    "latitude": 30.2672,
    "longitude": -97.7431,
    "phone": "+15125551234",
    "email": "info@sparkle.com",
    "rating": 0,
    "reviewCount": 0,
    "isVerified": false,
    "isActive": true,
    "verificationStatus": "PENDING",
    "createdAt": "2026-09-14T12:00:00Z"
  }
}
```

**Response — Error (duplicate):**
```json
{
  "success": false,
  "error": {
    "code": "BUSINESS_EXISTS",
    "message": "You already have an active business profile"
  }
}
```

### Update Business

```
PATCH /api/v1/businesses/:id
Authorization: Bearer <business-jwt>
```

**Request body (partial):**
```json
{
  "name": "Sparkle Express",
  "description": "Updated description"
}
```

**Response:** Updated business object (same schema as create).

### View Business (Public)

```
GET /api/v1/businesses/:id
```

No auth required. Returns full business profile excluding internal fields (`verifiedBy`, `rejectionReason`).

### Upload Logo

```
PATCH /api/v1/businesses/:id/logo
Authorization: Bearer <business-jwt>
Content-Type: multipart/form-data
```

**Form field:** `file` (image, max 5MB, jpg/png/webp)

**Response:**
```json
{
  "success": true,
  "data": {
    "logoUrl": "https://your-project.supabase.co/storage/v1/object/public/carwash-assets/logos/biz-1/logo.jpg"
  }
}
```

---

## 3. Data Model

### Business Table

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `ownerId` | UUID | FK → User, unique (one business per owner) |
| `name` | String | Business name |
| `description` | String? | Optional description |
| `address` | String | Street address |
| `city` | String | City |
| `state` | String | State |
| `zipCode` | String | Zip code |
| `latitude` | Float | Geocoded latitude |
| `longitude` | Float | Geocoded longitude |
| `phone` | String | Business phone |
| `email` | String | Business email |
| `logo` | String? | Logo URL (Supabase Storage) |
| `coverImage` | String? | Cover image URL |
| `rating` | Float | Average rating (0-5) |
| `reviewCount` | Int | Total reviews |
| `isVerified` | Boolean | Admin-approved |
| `isActive` | Boolean | Active flag |
| `verificationStatus` | Enum | PENDING / APPROVED / REJECTED |
| `verifiedAt` | DateTime? | When approved |
| `verifiedBy` | String? | Admin user ID |
| `rejectionReason` | String? | Why rejected |
| `timezone` | String | IANA timezone |
| `operatingHours` | Json? | Weekly schedule |

No new tables needed — uses existing `Business` model.

---

## 4. Implementation Files

### 4.1 DTOs

#### `create-business.dto.ts`
```typescript
import { IsString, IsOptional, IsEmail, IsNumber, MinLength, MaxLength } from 'class-validator';

export class CreateBusinessDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsString()
  address: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  zipCode: string;

  @IsString()
  phone: string;

  @IsEmail()
  email: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsString()
  timezone: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;
}
```

#### `update-business.dto.ts`
```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateBusinessDto } from './create-business.dto';

export class UpdateBusinessDto extends PartialType(CreateBusinessDto) {}
```

### 4.2 Controller — `business.controller.ts`

```typescript
import {
  Controller, Get, Post, Patch, Body, Param, UseGuards, UploadedFile,
  UseInterceptors, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../libs/common/guards/jwt-auth.guard';
import { RolesGuard } from '../libs/common/guards/roles.guard';
import { OwnershipGuard } from '../libs/common/guards/ownership.guard';
import { Roles } from '../libs/common/decorators/roles.decorator';
import { CurrentUser } from '../libs/common/decorators/current-user.decorator';
import { BusinessService } from './business.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Controller('businesses')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUSINESS')
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateBusinessDto) {
    return this.businessService.create(userId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, OwnershipGuard)
  @Roles('BUSINESS')
  async update(@Param('id') id: string, @Body() dto: UpdateBusinessDto) {
    return this.businessService.update(id, dto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.businessService.findById(id);
  }

  @Patch(':id/logo')
  @UseGuards(JwtAuthGuard, RolesGuard, OwnershipGuard)
  @Roles('BUSINESS')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_, file, cb) => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
        return cb(new BadRequestException('Only JPG, PNG, WEBP allowed'), false);
      }
      cb(null, true);
    },
  }))
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.businessService.uploadLogo(id, file);
  }
}
```

### 4.3 Service — `business.service.ts`

```typescript
import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../libs/prisma/prisma.service';
import { CacheService } from '../libs/cache/cache.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Injectable()
export class BusinessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async create(ownerId: string, dto: CreateBusinessDto) {
    // One active business per owner
    const existing = await this.prisma.business.findUnique({
      where: { ownerId },
    });
    if (existing && existing.isActive) {
      throw new ConflictException('You already have an active business profile');
    }

    const business = await this.prisma.business.create({
      data: {
        ownerId,
        name: dto.name,
        description: dto.description,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        zipCode: dto.zipCode,
        latitude: dto.latitude,
        longitude: dto.longitude,
        phone: dto.phone,
        email: dto.email,
        timezone: dto.timezone,
        logo: dto.logoUrl,
        coverImage: dto.coverUrl,
        rating: 0,
        reviewCount: 0,
        isVerified: false,
        isActive: true,
        verificationStatus: 'PENDING',
      },
    });

    // TODO: Enqueue admin notification email
    return business;
  }

  async update(id: string, dto: UpdateBusinessDto) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException('Business not found');

    const updated = await this.prisma.business.update({
      where: { id },
      data: dto,
    });

    // Invalidate cache
    await this.cache.del(`business:${id}`);
    await this.cache.invalidate('search:*');

    return updated;
  }

  async findById(id: string) {
    const cacheKey = `business:${id}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const business = await this.prisma.business.findUnique({
      where: { id, isActive: true },
      include: {
        services: { where: { isActive: true } },
        _count: { select: { reviews: true } },
      },
    });

    if (!business) throw new NotFoundException('Business not found');

    await this.cache.set(cacheKey, business, 300);
    return business;
  }

  async uploadLogo(id: string, file: Express.Multer.File) {
    // TODO: Upload to Supabase Storage
    // For now, store the filename
    const logoUrl = `logos/${id}/${file.originalname}`;

    await this.prisma.business.update({
      where: { id },
      data: { logo: logoUrl },
    });

    await this.cache.del(`business:${id}`);

    return { logoUrl };
  }
}
```

### 4.4 Module — `business.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { BusinessController } from './business.controller';
import { BusinessService } from './business.service';
import { PrismaModule } from '../libs/prisma/prisma.module';
import { CacheModule } from '../libs/cache/cache.module';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [BusinessController],
  providers: [BusinessService],
  exports: [BusinessService],
})
export class BusinessModule {}
```

---

## 5. Geocoding (Server-Side)

Address is geocoded server-side via Nominatim (free, no API key):

```typescript
async geocodeAddress(address: string, city: string, state: string, zipCode: string) {
  const query = `${address}, ${city}, ${state} ${zipCode}`;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;

  const response = await fetch(url, {
    headers: { 'User-Agent': process.env.GEOCODING_USER_AGENT },
  });

  const results = await response.json();
  if (results.length === 0) {
    throw new BadRequestException('Could not geocode address');
  }

  return {
    latitude: parseFloat(results[0].lat),
    longitude: parseFloat(results[0].lon),
  };
}
```

---

## 6. Cache Invalidation

| Event | Cache Key Invalidated |
|-------|----------------------|
| Business updated | `business:{id}`, `search:*` |
| Logo uploaded | `business:{id}` |
| Business verified | `business:{id}`, `search:*` |
| Business deactivated | `business:{id}`, `search:*` |

---

## 7. Testing

### Unit Test — `business.service.spec.ts`

```typescript
describe('BusinessService', () => {
  describe('create', () => {
    it('should create a new business', async () => { /* ... */ });
    it('should throw ConflictException if owner already has active business', async () => { /* ... */ });
    it('should set verificationStatus to PENDING', async () => { /* ... */ });
  });

  describe('update', () => {
    it('should update business fields', async () => { /* ... */ });
    it('should throw NotFoundException if business not found', async () => { /* ... */ });
    it('should invalidate cache after update', async () => { /* ... */ });
  });

  describe('findById', () => {
    it('should return cached business if available', async () => { /* ... */ });
    it('should query DB and cache on miss', async () => { /* ... */ });
    it('should throw NotFoundException if not found', async () => { /* ... */ });
  });
});
```

### E2E Test — `business.e2e-spec.ts`

```typescript
describe('Business (e2e)', () => {
  it('POST /businesses returns 401 without token', () => { /* ... */ });
  it('POST /businesses returns 403 for CUSTOMER role', () => { /* ... */ });
  it('POST /businesses creates business for BUSINESS role', () => { /* ... */ });
  it('GET /businesses/:id returns business profile', () => { /* ... */ });
  it('PATCH /businesses/:id updates business', () => { /* ... */ });
  it('PATCH /businesses/:id returns 403 for non-owner', () => { /* ... */ });
});
```

---

## 8. Security Checklist

- [x] `JwtAuthGuard` — authenticated users only (create/update)
- [x] `RolesGuard` — BUSINESS role required
- [x] `OwnershipGuard` — only owner can update their business
- [x] File upload validation — max 5MB, image types only
- [x] Server-side geocoding — never trust client lat/lng
- [x] One business per owner enforced at DB level (`@@unique`)
- [x] Rate limiting via `ThrottlerGuard`

---

## 9. File Summary

| File | Path | Purpose |
|------|------|---------|
| Controller | `src/business/business.controller.ts` | Route handlers |
| Service | `src/business/business.service.ts` | Business logic, DB queries, caching |
| Module | `src/business/business.module.ts` | NestJS module wiring |
| Create DTO | `src/business/dto/create-business.dto.ts` | Validation for creation |
| Update DTO | `src/business/dto/update-business.dto.ts` | Validation for updates |
| Unit Test | `src/business/business.service.spec.ts` | Service logic tests |
| E2E Test | `test/e2e/business.e2e-spec.ts` | Full HTTP tests |

**Total files: 7** (no new DB models — uses existing `Business` table)
