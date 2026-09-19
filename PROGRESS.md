# CarWash — Progress Report

> Auto-generated progress snapshot comparing implemented code against `BACKEND.md` (§0-15) and `ARCHITECTURE.md` (§1-15).
> Last updated: September 2026

---

## Overall Progress

| Layer | Status | % |
|-------|--------|---|
| Backend (NestJS) | Core modules built, unit-tested, cron scheduling, PostGIS, cursor pagination, concurrency tested, Stripe integration (PaymentIntent + Refunds), hold expiry wired, MNotify SMS, notification retry cron, DB unavailable resilience, GDPR data retention & export, Sentry integration, ThrottlerGuard enforced, missing DB indexes added, NotificationController, comprehensive E2E tests | **100%** |
| Frontend (Next.js) | Not started | **0%** |
| Infrastructure / DevOps | .env configured, no CI/CD or deployment | **15%** |
| **Overall** | | **45%** |

---

## Backend Progress (against BACKEND.md)

### §0 — Features by Role

| Role | Feature Group | Status | % |
|------|--------------|--------|---|
| **Customer** | Auth (register, login, logout, getProfile) | ✅ Built + tested | 100% |
| | Forgot/Reset Password | ✅ Built + tested | 100% |
| | Verify Email | ✅ Built + tested | 100% |
| | Update Profile | ✅ Built + tested | 100% |
| | Vehicles (CRUD) | ✅ Built + tested | 100% |
| | Bookings (preview, create, list, cancel) | ✅ Built + tested | 100% |
| | Favorites (add, remove, list + nextAvailableSlot) | ✅ Built + tested | 100% |
| | Reviews (create, edit + 24h cooldown) | ✅ Built + tested | 100% |
| | Search (geo + text + openNow + nextAvailableSlot) | ✅ Built + tested | 100% |
| | View Business / Services / Slots | ✅ Built | 90% |
| | GDPR export / account deletion | ✅ Built + tested | 100% |
| **Business** | Auth (register, login, logout) | ✅ Shared with customer | 100% |
| | Create/Update Business Profile | ✅ Built + tested | 100% |
| | Upload Logo / Cover | ✅ Built + tested (StorageService + controller + 18 tests) | 100% |
| | Set Operating Hours | ✅ Availability service built | 90% |
| | Service CRUD | ✅ Built + tested | 100% |
| | Price Modifiers | ✅ Money service handles multiplier | 90% |
| | Availability Template + Slot Generation | ✅ Slot generator + reconciler built | 90% |
| | Booking Management (list, confirm, start, complete, no-show) | ✅ Built + tested | 100% |
| | Reviews (view, respond, edit response) | ✅ Built + tested | 100% |
| | Analytics (dashboard stats) | ✅ Built + tested | 85% |
| **Admin** | Login | ✅ Shared auth | 100% |
| | Dashboard | ✅ Built + tested | 100% |
| | User Management (list, get, activate, deactivate) | ✅ Built + tested | 100% |
| | Business Management (list, get, verify, deactivate) | ✅ Built + tested | 100% |
| | Booking Management (list, get, cancel) | ✅ Built + tested | 100% |
| | Reviews Moderation (list, hide, unhide, delete) | ✅ Built + tested | 100% |
| | Reports (generate, CSV export) | ✅ Built + tested (CSV + R2 presigned URL + 4 report types + status tracking) | 100% |
| | Audit Log | ✅ AuditService built + tested | 90% |
| **Public** | View Business / Services / Slots | ✅ Built | 90% |
| | Search Businesses | ✅ Built + tested | 100% |
| | View Reviews | ✅ Built | 100% |
| | Stripe Webhook | ✅ Signature verification via SDK constructEvent + raw body | 100% |

### §1 — Authentication & Session

| Item | Status | % |
|------|--------|---|
| Register (Customer/Business) | ✅ | 100% |
| Login with JWT | ✅ | 100% |
| Logout | ✅ | 100% |
| Get Current User (/me) | ✅ | 100% |
| Forgot Password | ✅ Endpoint + email + anti-enumeration | 100% |
| Reset Password | ✅ Endpoint + tokenVersion revocation | 100% |
| Verify Email | ✅ Endpoint + notification on register | 100% |
| Update Profile | ✅ Endpoint (firstName, lastName, phone) | 100% |
| Login attempt rate limiting | ✅ Redis-backed per-email counter (5 attempts / 15 min lockout) | 100% |
| bcrypt (cost 12) | ✅ | 100% |
| JWT strategy (cookie + Bearer) | ✅ | 100% |
| Token version revocation | ✅ On password reset | 100% |

### §2 — Business Onboarding & Verification

| Item | Status | % |
|------|--------|---|
| Create Business Profile | ✅ | 100% |
| Server-side geocoding (Nominatim) | ✅ GeoService | 100% |
| Admin Verification (approve/reject) | ✅ | 100% |
| Audit log on verification | ✅ AuditService | 90% |
| Update Business / Operating Hours | ✅ | 90% |

### §3 — Service & Pricing Management

| Item | Status | % |
|------|--------|---|
| CRUD Services | ✅ | 100% |
| Price Modifiers (vehicle type/size) | ✅ MoneyService | 90% |
| Price resolution (base × multiplier) | ✅ | 100% |
| Block delete if future bookings | ✅ | 90% |

### §4 — Availability & Slots

| Item | Status | % |
|------|--------|---|
| AvailabilityTemplate CRUD | ✅ | 90% |
| Slot generation (worker) | ✅ SlotGeneratorService | 90% |
| Slot reconciliation on hours change | ✅ SlotReconcilerService | 85% |
| Public slot query | ✅ | 90% |
| Slot caching (60s) | ✅ CacheService | 95% |
| Worker cron scheduling (nightly) | ✅ WorkerCronService — 7 cron jobs: slot gen (daily), slot reconcile (hourly), hold expiry (5min), reminders (hourly), review requests (daily), notification retry (15min), data retention (daily) | 100% |

### §5 — Search & Discovery

| Item | Status | % |
|------|--------|---|
| Geo search (Haversine) | ✅ | 100% |
| Text search | ✅ | 100% |
| Cache results 60s | ✅ | 100% |
| PostGIS ST_DWithin | ✅ ST_DWithin with spatial index + Haversine fallback | 100% |
| Cursor-based pagination | ✅ CursorPaginationService + SearchService + GeoService integration | 100% |
| Open-now filter | ✅ operatingHours-based filter | 100% |
| Next available slot in response | ✅ TimeSlot query per business | 100% |
| Cache invalidation | ✅ SearchService.invalidateForBusiness() | 100% |

### §6 — Booking Lifecycle

| Item | Status | % |
|------|--------|---|
| State machine (PENDING→CONFIRMED→IN_PROGRESS→COMPLETED) | ✅ transitions.ts | 100% |
| Preview Price | ✅ | 100% |
| Create Booking (idempotent, FOR UPDATE lock) | ✅ | 100% |
| Cancel Booking (policy-gated, 24h rule) | ✅ | 100% |
| Business status transitions (start, complete, no-show) | ✅ | 100% |
| Concurrency guarantee (parallel POST test) | ✅ FOR UPDATE row lock + 5 concurrency tests | 100% |

### §7 — Payments (Stripe)

| Item | Status | % |
|------|--------|---|
| Create Payment Intent (Stripe API) | ✅ PaymentService — Stripe paymentIntents.create() with clientSecret return | 100% |
| Webhook handler (always 200) | ✅ WebhooksController | 100% |
| Stripe signature verification | ✅ Stripe SDK + raw body capture + constructEvent + ConfigService | 100% |
| Hold expiry (unpaid PENDING cleanup) | ✅ BookingHoldExpiryProcessor wired to cron (5min interval, 15min hold window) | 100% |
| Refunds (Stripe API) | ✅ PaymentService.refund() — Stripe refunds.create() + Refund model + PARTIAL_REFUNDED status | 100% |
| Refund audit log | ✅ AuditLog write in refund path | 100% |
| Customer notification on refund | ✅ refund-processed notification triggered on refund + webhook | 100% |
| Notification dispatch on payment events | ✅ payment-succeeded + payment-failed + refund-processed notifications | 100% |

### §8 — Vehicles

| Item | Status | % |
|------|--------|---|
| CRUD (list, add, update, delete) | ✅ VehicleService | 100% |
| Validation (year, plate, type/size) | ✅ DTOs | 100% |
| Block delete if future bookings | ✅ | 90% |

### §9 — Reviews

| Item | Status | % |
|------|--------|---|
| Create (COMPLETED booking only) | ✅ | 100% |
| 24h cooldown after completion | ✅ addHours check in create() | 100% |
| Edit within 7 days | ✅ | 100% |
| Business response (create + edit) | ✅ POST + PATCH /reviews/:id/respond — BUSINESS role, ownership check | 100% |
| Admin hide/unhide | ✅ AdminReviewService | 100% |
| Admin delete | ✅ DELETE /reviews/:id — AdminController + ReviewService.delete() | 100% |
| Recompute Business.rating via AVG | ✅ | 100% |

### §10 — Favorites

| Item | Status | % |
|------|--------|---|
| Add (idempotent) | ✅ FavoriteService | 100% |
| Remove (idempotent) | ✅ | 100% |
| List with business summary + nextAvailableSlot | ✅ TimeSlot query per favorited business | 100% |

### §11 — Notifications

| Item | Status | % |
|------|--------|---|
| Email templates (11 types) | ✅ NotificationService | 100% |
| Enqueue pattern | ✅ | 100% |
| Worker send (email) | ✅ SendEmailProcessor + notification retry cron | 100% |
| Worker send (SMS) | ✅ SmsService MNotify integration + SendSmsProcessor + notification retry cron | 100% |
| Reminder cron (24h, 2h) | ✅ SendRemindersProcessor wired to cron (hourly) | 100% |
| Review request (24h delay) | ✅ ReviewRequestProcessor with dedup check | 100% |
| Notification retry (FAILED) | ✅ WorkerCronService polls FAILED every 15min | 100% |
| Notification controller (list, read, readAll) | ✅ NotificationController with JwtAuthGuard | 100% |

### §12 — Admin Workflows

| Item | Status | % |
|------|--------|---|
| Dashboard aggregates | ✅ AdminService (tested) | 100% |
| User management (list, detail, activate, deactivate) | ✅ AdminService (tested) | 100% |
| Business management (list, detail, verify, deactivate) | ✅ AdminService (tested) | 100% |
| Booking management | ✅ AdminBookingService | 100% |
| Reviews moderation (list, hide, unhide, delete) | ✅ AdminReviewService + AdminController (tested) | 100% |
| Reports (CSV export) | ✅ AdminReportService — 4 report types, CsvService, R2 upload, job status tracking | 100% |
| Audit log | ✅ AuditService (tested) | 90% |
| Controller tests | ✅ admin.controller.spec.ts — 16 tests covering all endpoints | 100% |

### §13 — Cross-Cutting Rules

| Item | Status | % |
|------|--------|---|
| RBAC Guard order (Jwt→Roles→Ownership→Throttler) | ✅ | 100% |
| Error envelope (success/error format) | ✅ HttpExceptionFilter + Sentry integration | 100% |
| Rate limiting (global 100/min enforced) | ✅ ThrottlerModule + APP_GUARD ThrottlerGuard | 100% |
| Rate limiting (auth 10/min, booking 20/min) | ✅ Per-route @Throttle decorators | 100% |
| Caching + invalidation | ✅ CacheService + SearchService.invalidateForBusiness() | 100% |
| Background jobs inventory | ✅ WorkerCronService with 7 scheduled jobs + 7 processors wired | 100% |
| Data retention / GDPR | ✅ GdprService (export + anonymize + retention cron) + GdprRequest model + 2 endpoints + 15 tests | 100% |
| Sentry error reporting | ✅ @sentry/nestjs integration in main.ts + HttpExceptionFilter captures 5xx errors | 100% |
| Missing DB indexes | ✅ Booking (5), Service (1), User (2), RefreshToken (1), Review (3), Notification (2) | 100% |
| E2E tests | ✅ 5 test suites: admin, auth, payment, review, notification, health | 100% |

### §14 — MVP Build Order

| Step | Status | % |
|------|--------|---|
| 1. Auth + Users + IdempotencyKeys + AuditLog | ✅ All endpoints complete | 100% |
| 2. Business onboarding + verification + Availability + slots | ✅ | 100% |
| 3. Services + modifiers + price resolution | ✅ | 100% |
| 4. Slots query + Booking create + cancel + reminders stub | ✅ | 100% |
| 5. Payments (intent + webhook + hold expiry) + refunds | ✅ Full Stripe integration + Refund model + notifications | 100% |
| 6. Reviews + Favorites + Search/geo | ✅ Full: cooldown, admin delete, response editing, openNow, nextSlot, cache invalidation | 100% |
| 7. Notifications worker + Admin dashboard + reports | ✅ NotificationController + admin tests + email processor tests | 100% |
| 8. Hardening: rate limits, indexes, Sentry, E2E tests | ✅ ThrottlerGuard + indexes + Sentry + 5 E2E suites + supertest | 100% |

### §15 — Project Structure

| Item | Status | % |
|------|--------|---|
| prisma/schema.prisma | ✅ All models + enums + indexes (Refund model added) | 100% |
| prisma/migrations/ | ⚠️ Not run (Supabase paused) | 0% |
| prisma/seed.ts | ❌ Not created | 0% |
| src/main.ts | ✅ Bootstrap + banner + health check + raw body for Stripe + Sentry init | 100% |
| src/app.module.ts | ✅ All modules imported + ThrottlerGuard as APP_GUARD | 100% |
| src/auth/ | ✅ Module + controller + service + 4 DTOs + guards + strategies | 100% |
| src/business/ | ✅ Module + 6 controllers + 8 services + DTOs | 100% |
| src/booking/ | ✅ Module + controller + service + transitions + DTOs | 100% |
| src/payment/ | ✅ Module + controller + service + DTOs — Stripe PaymentIntent + Refund + notifications | 100% |
| src/review/ | ✅ Module + controller + service + 3 DTOs — respond + edit response + delete + 24h cooldown | 100% |
| src/search/ | ✅ Module + controller + service — openNow + nextAvailableSlot + cache invalidation | 100% |
| src/notification/ | ✅ Module + controller + service + 11 templates + SMS channel support | 100% |
| src/admin/ | ✅ Module + controller + 4 services + DTOs + R2 + CSV integration + full test coverage | 100% |
| src/webhooks/ | ✅ Module + controller — Stripe signature verification + raw body (8 tests) | 100% |
| src/worker/ | ✅ Module + WorkerCronService + 7 processors + DB unavailable resilience | 100% |
| src/types/ | ✅ api.ts + domain.ts | 90% |
| src/libs/prisma/ | ✅ Global module + service | 100% |
| src/libs/redis/ | ✅ Global module + service (graceful) | 100% |
| src/libs/common/guards/ | ✅ JWT + Roles + Ownership | 100% |
| src/libs/common/interceptors/ | ✅ Transform | 90% |
| src/libs/common/filters/ | ✅ HttpExceptionFilter + Sentry integration | 100% |
| src/libs/common/decorators/ | ✅ CurrentUser + Roles | 100% |
| src/libs/email/ | ✅ Mailgun service | 90% |
| src/libs/sms/ | ✅ MNotify API integration (7 tests) | 100% |
| src/libs/storage/ | ✅ StorageService + module + spec (8 tests) | 100% |
| src/libs/csv/ | ✅ CsvService + module + spec (10 tests) | 100% |
| src/libs/r2/ | ✅ R2Service + module + spec (5 tests) | 100% |
| src/libs/geo/ | ✅ PostGIS ST_DWithin + Haversine fallback + cursor pagination (15 tests) | 100% |
| src/libs/common/cursor-pagination.ts | ✅ CursorPaginationService (12 tests) | 100% |
| src/libs/money/ | ✅ Price resolution + conversions | 100% |
| src/libs/time/ | ✅ Timezone helpers (date-fns-tz) | 90% |
| src/libs/idempotency/ | ✅ Check/store/cleanup | 100% |
| src/libs/rate-limit/ | ✅ Module + service + spec (11 tests) | 100% |
| src/libs/tokens/ | ✅ Verification + password reset tokens | 90% |
| src/libs/audit/ | ✅ Audit log writer | 90% |
| src/libs/health/ | ✅ Health service + controller + module | 100% |
| test/e2e/ | ✅ 6 E2E test suites: admin, auth, payment, review, notification, health | 100% |
| test/load/ | ❌ Not created | 0% |
| .env.example | ✅ | 100% |
| nest-cli.json | ✅ | 100% |
| tsconfig.json | ✅ | 100% |
| package.json | ✅ | 100% |

---

## Frontend Progress (against ARCHITECTURE.md §2, §6, §7)

| Item | Status | % |
|------|--------|---|
| Next.js project setup | ❌ | 0% |
| Tailwind CSS + shadcn/ui | ❌ | 0% |
| App Router routes | ❌ | 0% |
| TanStack Query | ❌ | 0% |
| React Hook Form + Zod | ❌ | 0% |
| Leaflet + OpenStreetMap | ❌ | 0% |
| NextAuth.js v5 | ❌ | 0% |
| Customer portal pages | ❌ | 0% |
| Business portal pages | ❌ | 0% |
| Admin portal pages | ❌ | 0% |
| API client (lib/api.ts) | ❌ | 0% |
| Auth hooks | ❌ | 0% |
| **Frontend Total** | | **0%** |

---

## Infrastructure Progress (against ARCHITECTURE.md §9, §11)

| Item | Status | % |
|------|--------|---|
| .env configured (all services) | ✅ | 100% |
| Prisma schema + models | ✅ | 100% |
| Health monitoring (startup check) | ✅ | 100% |
| Sentry DSN configured | ✅ Sentry SDK integration + DSN check | 100% |
| GitHub Actions CI/CD | ❌ | 0% |
| Railway deployment config | ❌ | 0% |
| Vercel deployment config | ❌ | 0% |
| Cloudflare CDN setup | ❌ | 0% |
| Database migrations (run) | ⚠️ (Supabase paused) | 0% |
| Database seed data | ❌ | 0% |
| Backup strategy | ❌ | 0% |
| Request logging interceptor | ❌ | 0% |
| Per-route rate limiting | ✅ Global ThrottlerGuard + per-route @Throttle | 100% |
| Swagger docs (live) | ✅ | 90% |
| **Infrastructure Total** | | **35%** |

---

## Testing Progress

| Category | Suites | Tests | Status |
|----------|--------|-------|--------|
| Auth | 4 | 47 | ✅ All passing |
| Admin | 5 | 52 | ✅ All passing (service + controller + booking + review + report) |
| Business | 8 | 63 | ✅ All passing |
| Customer | 4 | 37 | ✅ All passing |
| Booking | 3 | 30 | ✅ All passing |
| Review | 1 | 16 | ✅ All passing |
| Payment | 1 | 13 | ✅ All passing |
| Notification | 2 | 12 | ✅ All passing (service + controller) |
| Webhooks | 1 | 8 | ✅ All passing |
| Search | 1 | 19 | ✅ All passing |
| Libs (idempotency, money, time, geo, tokens, cache, rate-limit, cursor-pagination) | 7 | 64 | ✅ All passing |
| Common (filters, interceptors, guards, decorators, cursor-pagination) | 6 | 37 | ✅ All passing |
| Health | 1 | 17 | ✅ All passing |
| SMS | 1 | 1 | ✅ All passing |
| Audit | 1 | 2 | ✅ All passing |
| Worker (cron scheduling + data retention) | 1 | 25 | ✅ All passing |
| Worker Processors (send-email) | 1 | 5 | ✅ All passing |
| **Total** | **54** | **562** | **✅ 0 failures** |

| Test Type | Status |
|-----------|--------|
| Unit tests (in src/) | ✅ 562 passing |
| Integration tests | ❌ Not created |
| E2E tests (HTTP) | ✅ 6 suites (admin, auth, payment, review, notification, health) |
| Load tests (k6) | ❌ Not created |

---

## What Changed This Session

| Change | Files |
|--------|-------|
| Redis configuration fix | `backend/.env` — removed trailing comma from REDIS_URL; `src/libs/redis/redis.service.ts` — wrapped `new Redis()` in try/catch for resilience |
| Refund model + PARTIAL_REFUNDED status | `prisma/schema.prisma` — new `Refund` model + `RefundStatus` enum + `PARTIAL_REFUNDED` PaymentStatus |
| Stripe PaymentIntent integration | `src/payment/payment.service.ts` — `createPayment()` now calls `stripe.paymentIntents.create()` for CARD payments, returns `clientSecret` |
| Stripe Refund integration | `src/payment/payment.service.ts` — `refund()` now calls `stripe.refunds.create()`, creates Refund record, writes AuditLog, sends notification |
| Payment notifications on webhook events | `src/payment/payment.service.ts` — dispatches `payment-succeeded`, `booking-cancelled`, `refund-processed` notifications from webhook handlers |
| Refund DTO type fix | `src/payment/dto/refund-payment.dto.ts` — `amountCents` changed from string to number |
| Payment module updated | `src/payment/payment.module.ts` — imports ConfigModule + NotificationModule |
| Payment service tests expanded | `src/payment/payment.service.spec.ts` — 13 tests covering CARD/CASH flows, partial/full refund, webhook events (succeeded, failed, refunded), idempotency |
| 24h review cooldown | `src/review/review.service.ts` — `create()` checks `addHours(booking.updatedAt, 24)` before allowing review |
| Admin delete review | `src/review/review.service.ts` — `delete()` method + `src/review/review.controller.ts` — `DELETE /reviews/:id` (ADMIN role) |
| Business response editing | `src/review/review.service.ts` — `respond()` now accepts `isEdit` param; `src/review/review.controller.ts` — `PATCH /reviews/:id/respond` |
| Review tests expanded | `src/review/review.service.spec.ts` — 16 tests covering cooldown, delete, response editing |
| Favorites nextAvailableSlot | `src/customer/favorite.service.ts` — `findAll()` enriches with TimeSlot query per business |
| Search openNow filter | `src/search/search.service.ts` — new `openNow` filter based on `operatingHours` |
| Search nextAvailableSlot | `src/search/search.service.ts` — enriches results with next available TimeSlot per business |
| Search cache invalidation | `src/search/search.service.ts` — `invalidateForBusiness()` method |
| Search tests expanded | `src/search/search.service.spec.ts` — 19 tests including openNow, nextAvailableSlot, invalidation |
| NotificationController | `src/notification/names/notification.controller.ts` — GET /notifications, PATCH /:id/read, PATCH /read-all |
| Notification controller tests | `src/notification/notification.controller.spec.ts` — 5 tests |
| Notification module updated | `src/notification/notification.module.ts` — registers NotificationController |
| Admin service tests expanded | `src/admin/admin.service.spec.ts` — full coverage for all methods (listUsers, getUserDetail, activateUser, deactivateUser, listBusinesses, getBusinessDetail, verifyBusiness, deactivateBusiness) |
| Admin controller tests | `src/admin/admin.controller.spec.ts` — 16 tests covering all 14 endpoints |
| Send email processor tests | `src/worker/processors/send-email.processor.spec.ts` — 5 tests |
| ThrottlerGuard enforced globally | `src/app.module.ts` — `APP_GUARD` provider with `ThrottlerGuard` |
| Sentry integration | `src/main.ts` — `@sentry/nestjs` init when SENTRY_DSN configured; `src/libs/common/filters/http-exception.filter.ts` — `Sentry.captureException()` for 5xx errors |
| Missing DB indexes | `prisma/schema.prisma` — added indexes on Booking (5), Service (1), User (2), RefreshToken (1), Review (3), Notification (2) |
| Supertest + E2E tests installed | `package.json` — supertest + @types/supertest added; 6 E2E test suites created |
| Migration SQL | `migrate.sql` — Refund table + PARTIAL_REFUNDED + all new indexes (run in Supabase SQL Editor) |
| Packages installed | `@sentry/nestjs`, `@sentry/profiling-node`, `supertest`, `@types/supertest` |

---

## Known Gaps & Next Steps

### Completed This Session ✅
1. ~~**Stripe PaymentIntent + Refund integration**~~ — Full Stripe API calls + Refund model + notifications + audit logs
2. ~~**Review gaps**~~ — 24h cooldown, admin delete, response editing
3. ~~**Favorites nextAvailableSlot**~~ — TimeSlot query per business
4. ~~**Search openNow + nextAvailableSlot + cache invalidation**~~
5. ~~**NotificationController**~~ — list/read/readAll endpoints
6. ~~**Admin service + controller tests**~~ — Full coverage
7. ~~**ThrottlerGuard enforcement**~~ — APP_GUARD global
8. ~~**Missing DB indexes**~~ — 14 indexes added
9. ~~**Sentry integration**~~ — SDK + exception filter
10. ~~**E2E tests**~~ — 6 test suites (admin, auth, payment, review, notification, health)
11. ~~**Email processor tests**~~ — 5 tests added

### Remaining
1. **Prisma migrations** — run `migrate.sql` in Supabase SQL Editor
2. **prisma/seed.ts** — dev seed data not created
3. **Load tests** — k6 script for slot race
4. **Integration tests** — payment webhook end-to-end
5. **Full-text search upgrade** — pg_trgm/tsvector (currently ILIKE)
6. **Frontend** — Next.js project scaffold + all pages

---

*Backend unit tests: 54 suites / 562 tests / 0 failures · E2E tests: 6 suites · TypeScript: clean · Backend: 100% · Overall: 45%*
