# CarWash Application Architecture

## 1. System Overview

CarWash is a web-based platform connecting customers with car-wash businesses. The architecture follows a **decoupled two-service model**: a Next.js frontend for the client layer and a NestJS backend for the API/service layer, communicating over HTTPS/REST.

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Customer   │  │  Business   │  │   Admin     │            │
│  │   Portal     │  │  Portal     │  │  Portal     │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          │                                      │
│              ┌───────────▼───────────┐                         │
│              │   Next.js 14+ (App)   │                         │
│              │  SSR/SSG + React UI   │                         │
│              │  Tailwind + shadcn/ui │                         │
│              └───────────┬───────────┘                         │
│                          │                                      │
│              ┌───────────▼───────────┐                         │
│              │   Vercel (Free Tier)  │                         │
│              │   Hosting + CDN       │                         │
│              └───────────┬───────────┘                         │
└──────────────────────────┼──────────────────────────────────────┘
                           │ HTTPS/REST API
┌──────────────────────────┼──────────────────────────────────────┐
│                     API LAYER                                    │
│              ┌───────────▼───────────┐                         │
│              │   NestJS Backend      │                         │
│              │  Controllers + Guards │                         │
│              │  Pipes + Interceptors │                         │
│              │  Modules + Providers  │                         │
│              └───────────┬───────────┘                         │
│                          │                                      │
│              ┌───────────▼───────────┐                         │
│              │   Railway (Free Tier) │                         │
│              │   Container Hosting   │                         │
│              └───────────┬───────────┘                         │
└──────────────────────────┼──────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────┐
│                   SERVICE LAYER (NestJS Modules)                │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐ │
│  │   Auth     │  │  Booking   │  │  Business  │  │ Payment  │ │
│  │  Module    │  │  Module    │  │  Module    │  │ Module   │ │
│  └────────────┘  └────────────┘  └────────────┘  └──────────┘ │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐ │
│  │Notification│ │  Review    │  │  Search    │  │  Admin   │ │
│  │  Module    │  │  Module    │  │  Module    │  │ Module   │ │
│  └────────────┘  └────────────┘  └────────────┘  └──────────┘ │
└──────────────────────────┼──────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────┐
│                    DATA LAYER                                    │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐ │
│  │ PostgreSQL │  │   Redis    │  │ Cloudflare │  │  Malgun  │ │
│  │ (Supabase  │  │ (Upstash   │  │ R2 (free)  │  │  (Email) │ │
│  │  Free)     │  │  Free)     │  │ 10GB free  │  │          │ │
│  └────────────┘  └────────────┘  └────────────┘  └──────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Technology Stack

### Frontend (Client Layer) — Next.js
| Component | Technology | Rationale | Cost |
|-----------|------------|-----------|------|
| Framework | **Next.js 14+** (React) | SSR/SSG for SEO, React ecosystem, App Router | Free |
| UI Library | **Tailwind CSS + shadcn/ui** | Rapid prototyping, consistent design, accessible components | Free |
| State Management | **TanStack Query** | Server state management, caching, optimistic updates | Free |
| Forms | **React Hook Form + Zod** | Type-safe validation, performance | Free |
| Maps | **Leaflet + OpenStreetMap** | Free map tiles, no API key required, open-source | Free |
| Geocoding | **Nominatim (OSM)** | Free geocoding, no key needed, self-hostable | Free |
| Authentication | **NextAuth.js v5** | OAuth, magic links, session management on client | Free |

### Backend (Service Layer) — NestJS
| Component | Technology | Rationale | Cost |
|-----------|------------|-----------|------|
| Runtime | **Node.js 20+ LTS** | JavaScript ecosystem, async I/O, scalability | Free |
| Framework | **NestJS** | Enterprise-grade, modular architecture, DI, decorators, pipes, guards | Free |
| ORM | **Prisma** | Type-safe database access, migrations, excellent DX | Free |
| Authentication | **@nestjs/passport + JWT** | Guards, strategies, role-based access control | Free |
| Validation | **class-validator + Zod** | Pipe-based validation, DTO decorators | Free |
| Documentation | **@nestjs/swagger** | Auto-generated OpenAPI from decorators | Free |
| Queue | **@nestjs/bullmq** | Background jobs, email sending, notifications | Free |

### Data Layer
| Component | Technology | Rationale | Cost |
|-----------|------------|-----------|------|
| Primary Database | **PostgreSQL 15+** (Supabase) | ACID compliance, PostGIS, full-text search | Free (500MB) |
| Cache | **Redis 7+** (Upstash) | Session storage, rate limiting, real-time data | Free (10K cmds/day) |
| File Storage | **Cloudflare R2** | Business images, receipts, 10GB free, no egress fees | Free (10GB) |
| Email | **Malgun** | Transactional email service | Free |
| SMS | **MNotify** | SMS notifications and reminders | Free |

### Infrastructure
| Component | Technology | Rationale | Cost |
|-----------|------------|-----------|------|
| Frontend Hosting | **Vercel** | Next.js optimal, serverless, auto-scaling, GitHub integration | Free |
| Backend Hosting | **Railway** | Docker/NestJS deployment, built-in PostgreSQL, cron jobs | Free (500 hrs/mo) |
| CDN | **Cloudflare** | Global content delivery, DDoS protection, SSL | Free |
| Monitoring | **Sentry** | Error tracking, performance monitoring, 5K errors/mo free | Free |
| CI/CD | **GitHub Actions** | Automated testing, deployment pipelines | Free (2K mins/mo) |

## 3. Architecture Pattern

### Recommended: **Decoupled Two-Service Architecture**

The frontend (Next.js) and backend (NestJS) are separate projects with clear boundaries:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   FRONTEND (Next.js)              BACKEND (NestJS)             │
│   ─────────────────               ────────────────              │
│   ├── src/app/                    ├── src/                      │
│   │   ├── (auth)/                 │   ├── main.ts               │
│   │   ├── (customer)/             │   ├── app.module.ts         │
│   │   ├── (business)/             │   ├── auth/                 │
│   │   ├── (admin)/                │   │   ├── auth.module.ts    │
│   │   └── layout.tsx              │   │   ├── auth.controller.ts│
│   ├── src/components/             │   │   ├── auth.service.ts   │
│   │   ├── ui/                     │   │   ├── dto/              │
│   │   ├── forms/                  │   │   └── guards/           │
│   │   └── layout/                 │   ├── business/             │
│   ├── src/lib/                    │   ├── booking/              │
│   │   ├── api.ts                  │   ├── payment/              │
│   │   ├── auth.ts                 │   ├── notification/         │
│   │   └── utils.ts                │   ├── review/               │
│   └── src/hooks/                  │   ├── search/               │
│       └── use*.ts                 │   ├── admin/                │
│                                   │   └── libs/                 │
│   Vercel Free Tier                │       ├── prisma/           │
│                                   │       ├── redis/            │
│                                   │       ├── stripe/           │
│                                   │       └── email/            │
│                                   │                             │
│                                   Railway Free Tier             │
│                                   (500 hrs/month)               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Communication: Next.js → HTTPS → NestJS REST API
Shared: Prisma schema (in backend), TypeScript types (exported)
```

### Why Two Services (Not Monolith)

| Concern | Monolith (Next.js API Routes) | Two Services (Next.js + NestJS) |
|---------|-------------------------------|----------------------------------|
| Separation | Business logic mixed with route handlers | Clean domain boundaries via NestJS modules |
| Scalability | Scales with frontend | Backend scales independently |
| Testing | Hard to test API in isolation | NestJS has native testing (unit, e2e) |
| Background jobs | Requires separate worker anyway | NestJS handles queues natively |
| Team scaling | Frontend + backend coupled | Frontend/backend devs work independently |
| Cost | Vercel serverless cold starts | Railway always-on, predictable costs |
| Deployment | Tied to frontend deploys | Independent release cycles |

### NestJS Module Architecture

Each domain is a self-contained NestJS module:

```
src/
├── auth/
│   ├── auth.module.ts           # Module definition
│   ├── auth.controller.ts       # HTTP route handlers
│   ├── auth.service.ts          # Business logic
│   ├── dto/                     # Data Transfer Objects
│   │   ├── register.dto.ts
│   │   └── login.dto.ts
│   ├── entities/                # Prisma entity types
│   ├── guards/                  # Auth guards (JWT, RBAC)
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   ├── strategies/              # Passport strategies
│   │   └── jwt.strategy.ts
│   └── interceptors/            # Logging, transform
├── business/
│   ├── business.module.ts
│   ├── business.controller.ts
│   ├── business.service.ts
│   ├── dto/
│   └── entities/
├── booking/
│   ├── booking.module.ts
│   ├── booking.controller.ts
│   ├── booking.service.ts
│   ├── dto/
│   └── entities/
├── libs/
│   ├── prisma/
│   │   ├── prisma.module.ts     # Global Prisma module
│   │   └── prisma.service.ts    # Connection pooling
│   ├── redis/
│   │   ├── redis.module.ts
│   │   └── redis.service.ts
│   ├── common/
│   │   ├── filters/             # Exception filters
│   │   ├── interceptors/        # Transform, logging
│   │   ├── pipes/               # Validation pipes
│   │   ├── guards/              # Rate limiting, ownership
│   │   └── decorators/          # Custom decorators
│   └── config/                  # Environment config
└── worker/                      # BullMQ processors (separate process)
    ├── worker.module.ts
    └── processors/
```

## 4. User Roles & Permissions

### Role Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                         ADMIN                                │
│  • Full platform access                                     │
│  • Manage all users, businesses, bookings                   │
│  • View all analytics and reports                           │
│  • System configuration                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       BUSINESS                              │
│  • Manage own business profile                              │
│  • Create/edit services and pricing                         │
│  • View/manage own bookings                                 │
│  • View own analytics                                       │
│  • Respond to reviews                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       CUSTOMER                              │
│  • Browse businesses and services                           │
│  • Create/manage bookings                                   │
│  • Manage profile and vehicles                              │
│  • Leave reviews                                            │
│  • View booking history                                     │
└─────────────────────────────────────────────────────────────┘
```

### Permission Matrix

| Action | Customer | Business | Admin |
|--------|----------|----------|-------|
| Browse businesses | ✅ | ✅ | ✅ |
| Create booking | ✅ | ❌ | ✅ |
| Cancel booking | ✅ (own) | ✅ (own) | ✅ |
| Manage services | ❌ | ✅ (own) | ✅ |
| View analytics | ❌ | ✅ (own) | ✅ |
| Manage users | ❌ | ❌ | ✅ |
| Approve businesses | ❌ | ❌ | ✅ |
| Process refunds | ❌ | ❌ | ✅ |

## 5. Core Domain Models

### Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│      User       │       │    Business     │       │    Customer     │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (UUID)       │──────▶│ id (UUID)       │       │ id (UUID)       │
│ email           │  1:1  │ ownerId (UUID)  │◀──────│ userId (UUID)   │
│ passwordHash    │       │ name            │  1:1  │ firstName       │
│ role (enum)     │       │ description     │       │ lastName        │
│ phone           │       │ address         │       │ phone           │
│ avatar          │       │ city            │       │ defaultVehicle  │
│ createdAt       │       │ state           │       │ createdAt       │
│ updatedAt       │       │ zipCode         │       │ updatedAt       │
│ isActive        │       │ latitude        │       └─────────────────┘
│ emailVerified   │       │ longitude       │
└─────────────────┘       │ phone           │
                          │ email           │
                          │ logo            │
                          │ coverImage      │
                          │ rating          │
                          │ reviewCount     │
                          │ isVerified      │
                          │ isActive        │
                          │ operatingHours  │
                          │ createdAt       │
                          │ updatedAt       │
                          └─────────────────┘
                                  │
                                  │ 1:N
                                  ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    Service      │       │    Booking      │       │    Vehicle      │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (UUID)       │◀──────│ id (UUID)       │       │ id (UUID)       │
│ businessId(UUID)│  N:1  │ customerId(UUID)│──────▶│ customerId(UUID)│
│ name            │       │ businessId(UUID)│       │ make            │
│ description     │       │ serviceId(UUID) │       │ model           │
│ category        │       │ vehicleId(UUID) │       │ year            │
│ basePrice       │       │ date            │       │ color           │
│ durationMinutes │       │ timeSlot        │       │ licensePlate    │
│ isActive        │       │ status (enum)   │       │ type (enum)     │
│ createdAt       │       │ totalPrice      │       │ size (enum)     │
│ updatedAt       │       │ notes           │       │ createdAt       │
└─────────────────┘       │ paymentId(UUID) │       └─────────────────┘
                          │ createdAt       │
                          │ updatedAt       │
                          └─────────────────┘
                                  │
                                  │ 1:1
                                  ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    Payment      │       │     Review      │       │   TimeSlot      │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (UUID)       │       │ id (UUID)       │       │ id (UUID)       │
│ bookingId(UUID) │       │ bookingId(UUID) │       │ businessId(UUID)│
│ amount          │       │ customerId(UUID)│       │ date            │
│ currency        │       │ businessId(UUID)│       │ startTime       │
│ status (enum)   │       │ rating (1-5)    │       │ endTime         │
│ method          │       │ comment         │       │ isAvailable     │
│ transactionId   │       │ response        │       │ maxBookings     │
│ createdAt       │       │ createdAt       │       │ currentBookings │
│ updatedAt       │       │ updatedAt       │       │ createdAt       │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

### Enums

```typescript
// User roles
enum UserRole {
  CUSTOMER = 'CUSTOMER',
  BUSINESS = 'BUSINESS',
  ADMIN = 'ADMIN'
}

// Booking status
enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED'
}

// Payment status
enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

// Vehicle types
enum VehicleType {
  SEDAN = 'SEDAN',
  SUV = 'SUV',
  TRUCK = 'TRUCK',
  VAN = 'VAN',
  MOTORCYCLE = 'MOTORCYCLE'
}

// Vehicle sizes
enum VehicleSize {
  COMPACT = 'COMPACT',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE'
}

// Service categories
enum ServiceCategory {
  EXTERIOR = 'EXTERIOR',
  INTERIOR = 'INTERIOR',
  FULL_WASH = 'FULL_WASH',
  DETAILING = 'DETAILING',
  ADD_ONS = 'ADD_ONS'
}
```

## 6. API Design

### RESTful Endpoints

#### Authentication
```
POST   /api/auth/register          # Register new user
POST   /api/auth/login             # Login user
POST   /api/auth/logout            # Logout user
POST   /api/auth/forgot-password   # Request password reset
POST   /api/auth/reset-password    # Reset password
GET    /api/auth/me                # Get current user
PUT    /api/auth/profile           # Update profile
```

#### Customers
```
GET    /api/customers              # List customers (admin)
GET    /api/customers/:id          # Get customer details
PUT    /api/customers/:id          # Update customer
DELETE /api/customers/:id          # Delete customer (soft)

# Vehicles
GET    /api/customers/:id/vehicles           # List vehicles
POST   /api/customers/:id/vehicles           # Add vehicle
PUT    /api/customers/:id/vehicles/:vehicleId # Update vehicle
DELETE /api/customers/:id/vehicles/:vehicleId # Remove vehicle

# Bookings
GET    /api/customers/:id/bookings           # List bookings
GET    /api/customers/:id/bookings/:bookingId # Get booking
```

#### Businesses
```
GET    /api/businesses                     # List businesses (public)
GET    /api/businesses/:id                 # Get business details
POST   /api/businesses                     # Create business
PUT    /api/businesses/:id                 # Update business
DELETE /api/businesses/:id                 # Delete business (soft)

# Services
GET    /api/businesses/:id/services        # List services
POST   /api/businesses/:id/services        # Create service
PUT    /api/businesses/:id/services/:serviceId  # Update service
DELETE /api/businesses/:id/services/:serviceId  # Delete service

# Availability
GET    /api/businesses/:id/availability    # Get availability
PUT    /api/businesses/:id/availability    # Update availability

# Bookings (Business View)
GET    /api/businesses/:id/bookings        # List bookings
PUT    /api/businesses/:id/bookings/:bookingId # Update booking status
```

#### Bookings
```
GET    /api/bookings                # List all bookings (admin)
GET    /api/bookings/:id            # Get booking details
POST   /api/bookings                # Create booking
PUT    /api/bookings/:id            # Update booking
DELETE /api/bookings/:id            # Cancel booking
```

#### Payments
```
POST   /api/payments                # Process payment
GET    /api/payments/:id            # Get payment details
POST   /api/payments/:id/refund     # Process refund
GET    /api/payments/history        # Payment history
```

#### Reviews
```
GET    /api/businesses/:id/reviews  # List business reviews
POST   /api/reviews                 # Create review
PUT    /api/reviews/:id             # Update review
DELETE /api/reviews/:id             # Delete review
POST   /api/reviews/:id/response    # Business response
```

#### Search
```
GET    /api/search/businesses       # Search businesses
       ?query=car wash
       &location=lat,lng
       &radius=10
       &service=exterior
       &minRating=4
       &sort=distance|rating|price
```

#### Admin
```
GET    /api/admin/dashboard         # Dashboard stats
GET    /api/admin/users             # List all users
GET    /api/admin/businesses        # List all businesses
PUT    /api/admin/businesses/:id/verify  # Verify business
GET    /api/admin/bookings          # List all bookings
GET    /api/admin/reports           # Generate reports
```

### API Response Format

```typescript
// Success response
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}

// Error response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

## 7. Security Architecture

### Authentication Flow

```
┌──────────────┐                    ┌──────────────┐
│    Client    │                    │    Server    │
└──────┬───────┘                    └──────┬───────┘
       │                                   │
       │  1. POST /api/auth/login          │
       │     { email, password }           │
       │──────────────────────────────────▶│
       │                                   │
       │                                   │  2. Validate credentials
       │                                   │  3. Generate JWT tokens
       │                                   │
       │  4. 200 OK                        │
       │     { accessToken, refreshToken } │
       │◀──────────────────────────────────│
       │                                   │
       │  5. GET /api/resource              │
       │     Authorization: Bearer <token> │
       │──────────────────────────────────▶│
       │                                   │
       │                                   │  6. Verify JWT
       │                                   │  7. Check permissions
       │                                   │
       │  8. 200 OK { data }               │
       │◀──────────────────────────────────│
```

### Security Measures

| Layer | Measure | Implementation |
|-------|---------|----------------|
| **Transport** | HTTPS | TLS 1.3, HSTS headers |
| **Authentication** | JWT | Short-lived access (15min), long-lived refresh (7d) |
| **Authorization** | RBAC | Role-based middleware on all routes |
| **Input Validation** | Zod schemas | Validate all API inputs |
| **SQL Injection** | ORM | Prisma parameterized queries |
| **XSS** | CSP | Content Security Policy headers |
| **CSRF** | Tokens | SameSite cookies, CSRF tokens |
| **Rate Limiting** | Redis | 100 requests/min per IP |
| **Data Encryption** | AES-256 | Sensitive data at rest |
| **Password Hashing** | bcrypt | 12 salt rounds |

### JWT Token Structure

```typescript
// Access Token (short-lived)
{
  sub: "user-uuid",
  email: "user@example.com",
  role: "CUSTOMER",
  iat: 1234567890,
  exp: 1234568790  // 15 minutes
}

// Refresh Token (long-lived)
{
  sub: "user-uuid",
  tokenVersion: 1,
  iat: 1234567890,
  exp: 1235172690  // 7 days
}
```

## 8. Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String
  role          UserRole  @default(CUSTOMER)
  phone         String?
  avatar        String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  isActive      Boolean   @default(true)
  emailVerified DateTime?

  // Relations
  customer      Customer?
  business      Business?
  refreshTokens RefreshToken[]
}

model Customer {
  id              String    @id @default(uuid())
  userId          String    @unique
  firstName       String
  lastName        String
  phone           String?
  defaultVehicle  String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  user            User      @relation(fields: [userId], references: [id])
  vehicles        Vehicle[]
  bookings        Booking[]
  favorites       Favorite[]
  reviews         Review[]
}

model Business {
  id            String    @id @default(uuid())
  ownerId       String    @unique
  name          String
  description   String?
  address       String
  city          String
  state         String
  zipCode       String
  latitude      Float
  longitude     Float
  phone         String
  email         String
  logo          String?
  coverImage    String?
  rating        Float     @default(0)
  reviewCount   Int       @default(0)
  isVerified    Boolean   @default(false)
  isActive      Boolean   @default(true)
  operatingHours Json?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  owner         User      @relation(fields: [ownerId], references: [id])
  services      Service[]
  bookings      Booking[]
  timeSlots     TimeSlot[]
  reviews       Review[]
}

model Vehicle {
  id          String      @id @default(uuid())
  customerId  String
  make        String
  model       String
  year        Int
  color       String?
  licensePlate String
  type        VehicleType
  size        VehicleSize
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  // Relations
  customer    Customer    @relation(fields: [customerId], references: [id])
  bookings    Booking[]

  @@unique([customerId, licensePlate])
}

model Service {
  id              String          @id @default(uuid())
  businessId      String
  name            String
  description     String?
  category        ServiceCategory
  basePrice       Decimal         @db.Decimal(10, 2)
  durationMinutes Int
  isActive        Boolean         @default(true)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  // Relations
  business        Business        @relation(fields: [businessId], references: [id])
  bookings        Booking[]
  priceModifiers  PriceModifier[]
}

model PriceModifier {
  id          String   @id @default(uuid())
  serviceId   String
  vehicleType VehicleType
  vehicleSize VehicleSize
  multiplier  Decimal  @db.Decimal(3, 2)

  // Relations
  service     Service  @relation(fields: [serviceId], references: [id])

  @@unique([serviceId, vehicleType, vehicleSize])
}

model TimeSlot {
  id              String    @id @default(uuid())
  businessId      String
  date            DateTime  @db.Date
  startTime       String    // "09:00"
  endTime         String    // "10:00"
  isAvailable     Boolean   @default(true)
  maxBookings     Int       @default(1)
  currentBookings Int       @default(0)
  createdAt       DateTime  @default(now())

  // Relations
  business        Business  @relation(fields: [businessId], references: [id])
  bookings        Booking[]

  @@unique([businessId, date, startTime])
}

model Booking {
  id            String        @id @default(uuid())
  customerId    String
  businessId    String
  serviceId     String
  vehicleId     String
  timeSlotId    String
  date          DateTime      @db.Date
  timeSlot      String        // "09:00 - 10:00"
  status        BookingStatus @default(PENDING)
  totalPrice    Decimal       @db.Decimal(10, 2)
  notes         String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  // Relations
  customer      Customer      @relation(fields: [customerId], references: [id])
  business      Business      @relation(fields: [businessId], references: [id])
  service       Service       @relation(fields: [serviceId], references: [id])
  vehicle       Vehicle       @relation(fields: [vehicleId], references: [id])
  timeSlot_rel  TimeSlot      @relation(fields: [timeSlotId], references: [id])
  payment       Payment?
  review        Review?
}

model Payment {
  id              String        @id @default(uuid())
  bookingId       String        @unique
  amount          Decimal       @db.Decimal(10, 2)
  currency        String        @default("USD")
  status          PaymentStatus @default(PENDING)
  method          String?       // "card", "cash"
  transactionId   String?       // External payment processor ID
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Relations
  booking         Booking       @relation(fields: [bookingId], references: [id])
}

model Review {
  id          String   @id @default(uuid())
  bookingId   String   @unique
  customerId  String
  businessId  String
  rating      Int      // 1-5
  comment     String?
  response    String?  // Business response
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  booking     Booking  @relation(fields: [bookingId], references: [id])
  customer    Customer @relation(fields: [customerId], references: [id])
  business    Business @relation(fields: [businessId], references: [id])
}

model Favorite {
  id          String   @id @default(uuid())
  customerId  String
  businessId  String
  createdAt   DateTime @default(now())

  // Relations
  customer    Customer @relation(fields: [customerId], references: [id])
  business    Business @relation(fields: [businessId], references: [id])

  @@unique([customerId, businessId])
}

model RefreshToken {
  id          String   @id @default(uuid())
  userId      String
  token       String   @unique
  expiresAt   DateTime
  createdAt   DateTime @default(now())

  // Relations
  user        User     @relation(fields: [userId], references: [id])
}

// Enums
enum UserRole {
  CUSTOMER
  BUSINESS
  ADMIN
}

enum BookingStatus {
  PENDING
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  REFUNDED
}

enum PaymentStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  REFUNDED
}

enum VehicleType {
  SEDAN
  SUV
  TRUCK
  VAN
  MOTORCYCLE
}

enum VehicleSize {
  COMPACT
  MEDIUM
  LARGE
}

enum ServiceCategory {
  EXTERIOR
  INTERIOR
  FULL_WASH
  DETAILING
  ADD_ONS
}
```

## 9. Deployment Architecture

### Production Environment

```
┌─────────────────────────────────────────────────────────────────┐
│                        CDN (Cloudflare)                         │
│                    Static Assets + DDoS Protection              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────┐
│                     VERCEL / AWS                                │
│  ┌───────────────────────▼───────────────────────┐             │
│  │           Next.js Application                 │             │
│  │        (Serverless Functions)                 │             │
│  └───────────────────────┬───────────────────────┘             │
│                          │                                      │
│  ┌───────────────────────▼───────────────────────┐             │
│  │              Vercel Edge Functions            │             │
│  │           (Middleware, Auth, ISR)              │             │
│  └───────────────────────┬───────────────────────┘             │
└──────────────────────────┼──────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────┐
│                    DATABASE TIER                                │
│  ┌───────────────────────▼───────────────────────┐             │
│  │         PostgreSQL (Supabase / RDS)           │             │
│  │              Primary + Read Replica            │             │
│  └───────────────────────┬───────────────────────┘             │
│                          │                                      │
│  ┌───────────────────────▼───────────────────────┐             │
│  │            Redis (Upstash / ElastiCache)       │             │
│  │              Cache + Sessions + Queue           │             │
│  └───────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

### Environment Configuration

```env
# Database
DATABASE_URL="postgresql://user:pass@host:5432/carwash"
REDIS_URL="redis://default:pass@host:6379"

# Authentication
NEXTAUTH_URL="https://carwash.com"
NEXTAUTH_SECRET="your-secret-key"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Payment (Stripe)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Maps
GOOGLE_MAPS_API_KEY="..."

# Email (SendGrid)
SENDGRID_API_KEY="SG...."
FROM_EMAIL="noreply@carwash.com"

# Storage (S3)
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_BUCKET_NAME="carwash-assets"
AWS_REGION="us-east-1"

# Monitoring
SENTRY_DSN="https://..."
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test
      - run: pnpm lint
      - run: pnpm typecheck

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## 10. Performance Optimization

### Caching Strategy

| Data Type | TTL | Strategy |
|-----------|-----|----------|
| Business listings | 5 min | Stale-while-revalidate |
| Service prices | 15 min | Cache-aside |
| User sessions | 24 hr | Write-through |
| Search results | 1 min | Cache with invalidation |
| Booking data | Real-time | No caching |

### Database Optimization

```sql
-- Indexes for frequently queried columns
CREATE INDEX idx_businesses_location ON businesses USING GIST (
  point(longitude, latitude)
);

CREATE INDEX idx_bookings_customer ON bookings(customer_id, date DESC);
CREATE INDEX idx_bookings_business ON bookings(business_id, date DESC);
CREATE INDEX idx_bookings_status ON bookings(status) WHERE status IN ('PENDING', 'CONFIRMED');

CREATE INDEX idx_services_business ON services(business_id) WHERE is_active = true;
CREATE INDEX idx_timeslots_business_date ON time_slots(business_id, date);

CREATE INDEX idx_reviews_business ON reviews(business_id, created_at DESC);
```

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| First Contentful Paint | < 1.5s | Lighthouse |
| Largest Contentful Paint | < 2.5s | Lighthouse |
| Time to Interactive | < 3.5s | Lighthouse |
| API Response Time | < 200ms | p95 |
| Database Query Time | < 50ms | p95 |
| Uptime | 99.9% | Monitoring |

## 11. Monitoring & Observability

### Monitoring Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    OBSERVABILITY                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Sentry    │  │ Prometheus  │  │   Grafana   │        │
│  │   (Errors)  │  │ (Metrics)   │  │ (Dashboards)│        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │    Vercel   │  │  PostgreSQL │  │    Redis    │        │
│  │  Analytics  │  │   Logs      │  │   Metrics   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Key Metrics to Track

**Business Metrics:**
- Bookings per day/week/month
- Revenue per business
- Average booking value
- Customer retention rate
- Business activation rate

**Technical Metrics:**
- API response times (p50, p95, p99)
- Error rates by endpoint
- Database query performance
- Cache hit rates
- Queue processing times

**User Metrics:**
- Page load times
- Conversion rates
- User engagement
- Feature adoption

## 12. Scalability Considerations

### Horizontal Scaling

```
                    ┌─────────────────┐
                    │   Load Balancer  │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   App Server  │   │   App Server  │   │   App Server  │
│     (1)       │   │     (2)       │   │     (3)       │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  PostgreSQL   │   │    Redis      │   │   S3/Blob     │
│   Primary     │   │   Cluster     │   │   Storage     │
└───────────────┘   └───────────────┘   └───────────────┘
```

### Scaling Triggers

| Metric | Threshold | Action |
|--------|-----------|--------|
| CPU Usage | > 70% | Scale out app servers |
| Memory Usage | > 80% | Scale up or out |
| DB Connections | > 100 | Add read replicas |
| Queue Length | > 1000 | Add worker processes |
| Response Time | > 500ms | Scale out + optimize |

## 13. Disaster Recovery

### Backup Strategy

| Component | Frequency | Retention | Method |
|-----------|-----------|-----------|--------|
| Database | Daily | 30 days | Automated snapshots |
| Database WAL | Continuous | 7 days | Point-in-time recovery |
| User uploads | Real-time | Indefinite | S3 versioning |
| Configuration | On change | Indefinite | Git repository |

### Recovery Procedures

1. **Database Failure**: Restore from latest snapshot + WAL replay
2. **Application Failure**: Auto-restart via serverless/containers
3. **Region Failure**: Failover to secondary region (if multi-region)
4. **Data Corruption**: Point-in-time recovery to pre-corruption state

## 14. Cost Estimation (Monthly)

### MVP Phase (1,000 users)

| Service | Provider | Cost |
|---------|----------|------|
| Hosting | Vercel Pro | $20 |
| Database | Supabase Pro | $25 |
| Redis | Upstash | $10 |
| Storage | AWS S3 | $5 |
| Email | SendGrid | $15 |
| Monitoring | Sentry | $26 |
| Maps | Google Maps | $50 |
| Domain + SSL | Cloudflare | $15 |
| **Total** | | **~$166** |

### Growth Phase (10,000 users)

| Service | Provider | Cost |
|---------|----------|------|
| Hosting | Vercel Pro | $20 |
| Database | Supabase Pro | $25 |
| Redis | Upstash | $30 |
| Storage | AWS S3 | $20 |
| Email | SendGrid | $50 |
| Monitoring | Sentry | $80 |
| Maps | Google Maps | $200 |
| CDN | Cloudflare Pro | $25 |
| **Total** | | **~$450** |

## 15. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)
- [ ] Project setup and configuration
- [ ] Database schema and migrations
- [ ] Authentication system
- [ ] Basic UI components
- [ ] User registration and login

### Phase 2: Core Features (Weeks 5-8)
- [ ] Business listing and profiles
- [ ] Service management
- [ ] Vehicle management
- [ ] Booking system
- [ ] Customer dashboard

### Phase 3: Business Features (Weeks 9-12)
- [ ] Business dashboard
- [ ] Booking management
- [ ] Availability management
- [ ] Basic analytics

### Phase 4: Enhancements (Weeks 13-16)
- [ ] Payment integration
- [ ] Review system
- [ ] Search and filtering
- [ ] Notifications

### Phase 5: Polish (Weeks 17-20)
- [ ] Admin dashboard
- [ ] Performance optimization
- [ ] Security hardening
- [ ] Testing and QA

### Phase 6: Launch (Weeks 21-24)
- [ ] Beta testing
- [ ] Bug fixes
- [ ] Documentation
- [ ] Production deployment
- [ ] Monitoring setup

---

*Last Updated: September 2026*
*Version: 1.0.0*


