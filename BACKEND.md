# CarWash Backend Workflows

> Companion to `ARCHITECTURE.md` v1.0 and `OVERVIEW.md`.
> This document defines **how the backend behaves**, step-by-step, for a web-based modular monolith (Next.js Route Handlers + Prisma + PostgreSQL + Redis + separate worker).
> No frontend logic here — only API contracts, state transitions, invariants, and failure handling.

**Conventions used in this doc:**
- Base path: `/api/v1/...`
- Auth: Auth.js v5, httpOnly cookie session. `X-Idempotency-Key: <uuid>` required on `POST /bookings` and `POST /payments`.
- All mutating workflows run input validation (Zod) → auth → RBAC → transaction → side-effects via outbox/queue.
- Money in minor units (cents) internally, `Decimal(10,2)` at rest. Currency default `USD` (configurable per business later).
- Times stored in UTC. Business timezone stored on `Business.timezone`. Client sends `date: YYYY-MM-DD` + `startTime: HH:mm` in business local time; backend converts to UTC for storage/comparison.
- Soft delete: `isActive=false` + `deletedAt`. Never hard-delete Users, Businesses, Bookings, Payments.

---

## 1. Authentication & Session

### 1.1 Register (Customer or Business Owner)
**Endpoint:** `POST /api/v1/auth/register`

**Input:** `{ email, password, role: CUSTOMER|BUSINESS, firstName, lastName, phone? }`

**Workflow:**
1. Validate with Zod: email format, password >= 8 chars, role allowed (never accept `ADMIN` from public).
2. Normalize email lowercase + trim. Check `User` by email — if exists, return `409 CONFLICT` (generic message to avoid enumeration: "Unable to create account").
3. Hash password with bcrypt (cost 12).
4. Transaction:
   - Create `User { email, passwordHash, role, isActive:true }`
   - If CUSTOMER: create `Customer { userId, firstName, lastName }`
   - If BUSINESS: create `Customer?` No — create stub `Business` in `PENDING_PROFILE` state? Better: create `User` only, business profile completed in onboarding (see §2). Store `pendingRole=BUSINESS`.
   - Create `VerificationToken { userId, token, expiresAt: +24h }`
5. Enqueue `send-verification-email` job (BullMQ / Trigger.dev). Do NOT block response on email send.
6. Return `201 { userId, email, requiresVerification:true }`. Do NOT auto-login until verified (configurable).

**Failures:**
- Duplicate email → 409
- Validation → 422 with field errors
- DB error → 500 + Sentry capture, no leak of internals

### 1.2 Login
**Endpoint:** `POST /api/v1/auth/login`

**Workflow:**
1. Validate `{ email, password }`.
2. Lookup `User where email + isActive=true`. If not found or password mismatch → `401` with generic message + increment Redis login-attempt counter `login:fail:<ip>:<email>`.
3. If `login:fail` count > 5 in 15 min → `429` with `Retry-After`.
4. If `!emailVerified` → `403 EMAIL_NOT_VERIFIED` (allow resend endpoint).
5. Verify bcrypt. On success reset fail counter.
6. Create Auth.js session (database session + httpOnly `Secure; SameSite=Lax` cookie). Include `tokenVersion` for revocation.
7. Update `User.lastLoginAt`.
8. Return `200 { user { id, email, role }, customer?, business? }`.

### 1.3 Logout / Refresh / Password Reset
- `POST /api/v1/auth/logout` — delete session row, clear cookie. Idempotent (always 200).
- `POST /api/v1/auth/refresh` — handled by Auth.js session rotation. Custom JWT refresh only if stateless mode chosen; prefer database sessions for instant revocation.
- `POST /api/v1/auth/forgot-password` — always return 200 (anti-enumeration). If user exists, create `PasswordResetToken (expires 1h, single-use)` + enqueue email.
- `POST /api/v1/auth/reset-password { token, newPassword }` — validate token unused + unexpired → bcrypt hash → update `User` + bump `tokenVersion` (revokes all sessions) → mark token used → enqueue confirmation email.

### 1.4 Get Current User
`GET /api/v1/auth/me` → 200 with user + role-specific profile. 401 if no valid session. Used by frontend to hydrate RBAC.

---

## 2. Business Onboarding & Verification

### 2.1 Create Business Profile
**Endpoint:** `POST /api/v1/businesses` (auth: BUSINESS)

**Input:** `{ name, description?, address, city, state, zipCode, phone, email, latitude, longitude, timezone, logoUrl?, coverUrl? }`

**Workflow:**
1. RBAC: caller `role==BUSINESS`. One active business per owner for MVP (enforce `ownerId unique`).
2. Validate address + geocode server-side (Google Maps Geocoding) — do NOT trust client lat/lng blindly. If geocode fails, accept manual coords but flag `geoConfidence=low`.
3. Transaction: create `Business { ownerId, ..., isVerified:false, isActive:true, rating:0, reviewCount:0 }`.
4. Enqueue `admin-notify-new-business` + set `Business.verificationStatus=PENDING`.
5. Return `201 business`.

### 2.2 Admin Verification
**Endpoint:** `PUT /api/v1/admin/businesses/:id/verify { action: APPROVE|REJECT, reason? }` (auth: ADMIN)

**Workflow:**
1. Load business with owner. Must be `PENDING`.
2. APPROVE → `isVerified=true, verificationStatus=APPROVED, verifiedAt=now, verifiedBy=adminId`. Enqueue `business-approved` email + notification.
3. REJECT → `verificationStatus=REJECTED, rejectionReason`. Keep `isVerified=false`. Enqueue email with reason.
4. Audit log entry `AuditLog { actorId, action, entityType:BUSINESS, entityId, metadata }`.
5. Unverified businesses: hidden from public search (`isVerified` filter), but owner can still manage dashboard.

### 2.3 Update Business / Operating Hours
`PATCH /api/v1/businesses/:id` (owner or admin). Validate ownership (`business.ownerId == session.userId` or admin). Operating hours stored as typed JSON:

```json
{
  "timezone": "America/New_York",
  "weekly": { "mon": [["09:00","17:00"]], "tue": [["09:00","17:00"]], "...": [] },
  "exceptions": [{ "date": "2026-12-25", "closed": true }]
}
```

Changing hours does NOT retroactively move existing bookings — triggers `reconcile-future-slots` job (see §4.3).

---

## 3. Service & Pricing Management

### 3.1 CRUD Services
- `GET /api/v1/businesses/:id/services?activeOnly=true` — public, only `isActive=true` + verified business.
- `POST /api/v1/businesses/:id/services` (owner) — `{ name, description?, category, basePriceCents, durationMinutes }`. `durationMinutes` in {15,30,45,60,90,120} recommended. `basePrice > 0`.
- `PATCH /api/v1/businesses/:id/services/:serviceId` — price/duration changes apply only to **future** bookings. Past bookings immutable (financial record).
- `DELETE /api/v1/businesses/:id/services/:serviceId` — soft delete (`isActive=false`). Block if future `CONFIRMED` bookings reference it → return `409 HAS_FUTURE_BOOKINGS` with count; owner must reschedule/cancel first.

### 3.2 Price Modifiers
`PUT /api/v1/businesses/:id/services/:serviceId/modifiers` — bulk upsert `[{ vehicleType, vehicleSize, multiplier|fixedDeltaCents, kind: MULTIPLIER|FIXED }]`.

**Price resolution (backend canonical, never trust client total):**
```
unitPrice = basePrice * multiplier + fixedDelta
totalPrice = unitPrice (MVP: single service per booking)
```
Round to cents. Return breakdown in booking preview so frontend can display without computing.

---

## 4. Availability — Template + Slot Instances

This fixes the TimeSlot-explosion problem noted in architecture review.

### 4.1 Availability Template (recurring rules)
**Endpoint:** `PUT /api/v1/businesses/:id/availability`

**Input:**
```json
{
  "slotLengthMinutes": 30,
  "bufferMinutes": 10,
  "maxParallel": 2,
  "weekly": { "mon": [["09:00","17:00"]], "sat": [["10:00","14:00"]] },
  "blackouts": ["2026-12-25"]
}
```

**Workflow:**
1. Validate: slots divide operating windows, buffer >= 0, maxParallel 1..10.
2. Save to `AvailabilityTemplate (businessId unique)`.
3. Enqueue `generate-slots { businessId, horizonDays: 30 }`.

### 4.2 Slot Generation (worker / cron)
**Job:** `generate-slots` runs nightly + on template change.

1. Load template + timezone. For each day `today..today+30`:
   - Skip if blackout or business closed that weekday.
   - Slice open windows into `[start,end)` chunks of `slotLength + buffer`.
   - Upsert `TimeSlot { businessId, date, startTime, endTime, maxBookings, currentBookings, isAvailable:true }` with `@@unique([businessId,date,startTime])`. Use `ON CONFLICT DO NOTHING` — never overwrite `currentBookings`.
2. Past slots (`date < today`) marked `isAvailable=false` (or archived by retention job after 90 days).

### 4.3 Reconciliation on Hours Change
Job `reconcile-future-slots`: for future dates, delete generated slots outside new hours **only if `currentBookings==0`**; if `>0`, keep slot but mark `orphaned=true` and notify business to reschedule. Never auto-cancel paid bookings.

### 4.4 Public Availability Query
`GET /api/v1/businesses/:id/slots?date=2026-09-20&serviceId=...`

1. Validate business verified + active, date within `[today, today+30]`.
2. Load service `durationMinutes` → filter slots where `slotLength >= duration` (or combine consecutive slots for MVP: reject if not fitting).
3. Return `[{ startTime, endTime, remaining: maxBookings-currentBookings, isAvailable }]` ordered ascending. Cache 60s in Redis `slots:{businessId}:{date}` with invalidation on booking create/cancel.

---

## 5. Search & Discovery

**Endpoint:** `GET /api/v1/businesses?query=&lat=&lng=&radiusKm=10&service=&minRating=&sort=distance|rating|price& compositions`

**Workflow:**
1. If `lat/lng` present: PostGIS query `ST_DWithin(geog, ST_MakePoint(lng,lat)::geography, radiusM)` + `ST_Distance` for sorting. Require `isVerified=true AND isActive=true`.
2. Else full-text: `to_tsvector(name || description || city)` or Meilisearch later. MVP uses Postgres `pg_trgm` + `tsvector`.
3. Filters: `service category`, `minRating`, open-now (join today's slots).
4. Pagination: `cursor` preferred (`?cursor=&limit=20`), return `nextCursor`. Avoid offset for large lists.
5. Cache search results 60s (`search:{hash}`), invalidate on business/service update.
6. Response includes `distanceKm`, `rating`, `reviewCount`, `startingPriceCents`, `nextAvailableSlot`.

---

## 6. Booking Lifecycle (Core)

**Status machine:** `PENDING → CONFIRMED → IN_PROGRESS → COMPLETED` with `CANCELLED` and `REFUNDED` as terminal branches.

```
PENDING --(confirm: payment ok / business accepts)--> CONFIRMED
CONFIRMED --(business starts service)--> IN_PROGRESS
IN_PROGRESS --(business completes)--> COMPLETED
PENDING|CONFIRMED --(customer|business|admin cancels, policy check)--> CANCELLED
CANCELLED|COMPLETED --(refund approved)--> REFUNDED (via payment refund)
```

### 6.1 Preview Price (no side effects)
`POST /api/v1/bookings/preview { businessId, serviceId, vehicleId, date, startTime }`
- Validates existence + ownership of vehicle (`vehicle.customerId == caller`).
- Resolves price via §3.2. Returns `{ unitPriceCents, totalPriceCents, breakdown, durationMinutes }`. No DB writes.

### 6.2 Create Booking (transactional — prevents double-booking)
`POST /api/v1/bookings` + `X-Idempotency-Key` header (auth: CUSTOMER)

**Input:** `{ businessId, serviceId, vehicleId, date, startTime, notes? }`

**Workflow (single Prisma interactive transaction):**
1. Idempotency check: lookup `IdempotencyKey { key, userId }`. If found → return stored response (201) without re-executing.
2. Validate: business verified+active, service active+belongs to business, vehicle belongs to caller, date within window, slot exists.
3. **Lock slot row:** `SELECT ... FOR UPDATE` on `TimeSlot where businessId+date+startTime`. If `!isAvailable OR currentBookings >= maxBookings` → `409 SLOT_TAKEN`. Frontend must re-query slots.
4. Re-resolve price server-side (never accept client total).
5. Create `Booking { status: PENDING, totalPrice, ... }`.
6. Increment `TimeSlot.currentBookings`. If now full, keep `isAvailable=true` but `remaining=0` (or set false if `maxBookings==1`).
7. Store idempotency result.
8. After commit (outbox pattern): enqueue `booking-created` → sends confirmation email + push to customer + new-booking notification to business. Invalidate `slots:{businessId}:{date}` cache.

**Concurrency guarantee:** step 3 serialization via row lock + unique constraint prevents oversell even under parallel requests. Load-test with parallel `POST` to same slot.

**Response:** `201 { bookingId, status:PENDING, totalPriceCents, date, startTime, endTime }`

### 6.3 Confirm Booking
- If pay-online: confirmation happens automatically on `payment.succeeded` webhook (§7.3) → `PENDING→CONFIRMED`.
- If pay-at-location: business confirms via `PATCH /api/v1/businesses/:id/bookings/:bookingId { action: CONFIRM }` (owner). Validates `PENDING→CONFIRMED` only.

### 6.4 Business Status Transitions
`PATCH /api/v1/businesses/:id/bookings/:bookingId { action: START|COMPLETE|NO_SHOW }` (owner)
- `START`: `CONFIRMED→IN_PROGRESS`, set `startedAt`.
- `COMPLETE`: `IN_PROGRESS→COMPLETED`, set `completedAt`. Enqueue `review-request` email (24h delay) + `receipt` if paid.
- `NO_SHOW`: `CONFIRMED→CANCELLED { cancelReason:NO_SHOW }`, release slot (`decrement currentBookings`), apply no-show policy (e.g., fee) if configured.

### 6.5 Cancel Booking (policy-gated)
`DELETE /api/v1/bookings/:id { reason? }` (customer own, business own, admin)

**Policy (configurable per business, defaults):**
- Free cancel if `startTime - now >= 24h`.
- Late cancel (<24h): requires business approval OR forfeits deposit (if prepaid, refund 0% — MVP: block self-cancel, prompt to contact business).
- `COMPLETED/REFUNDED` cannot be cancelled → 422.

**Workflow in transaction:**
1. Load booking + payment. Validate transition allowed.
2. Set `Booking.status=CANCELLED, cancelledAt, cancelledBy:{userId,role}, cancelReason`.
3. Decrement `TimeSlot.currentBookings`.
4. If paid + within refund window → create `RefundRequest` + enqueue refund job (§7.4). Else just release slot.
5. Enqueue cancellation notifications to both parties. Invalidate slot cache.

### 6.6 Get Bookings
- Customer: `GET /api/v1/customers/me/bookings?status=&upcoming=true&page=` — owns only.
- Business: `GET /api/v1/businesses/:id/bookings?date=&status=` — owner only, includes customer + vehicle + service joins.
- Admin: `GET /api/v1/admin/bookings?...` — all, with filters.

---

## 7. Payments (Stripe)

MVP supports `card-online` + `cash-on-site`. All online money via Stripe PaymentIntents. Backend never touches raw card numbers (PCI SAQ-A).

### 7.1 Create Payment Intent
`POST /api/v1/payments { bookingId, method: CARD }` (customer, owns booking)

1. Load booking `PENDING` + owned by caller. If `Payment where bookingId SUCCEEDED` exists → 409.
2. Amount = `Booking.totalPrice` (re-validated). Create `Payment { bookingId, amount, currency, status:PROCESSING, method:CARD }`.
3. Call Stripe `paymentIntents.create { amount, currency, metadata:{bookingId, paymentId} }`.
4. Return `200 { clientSecret, paymentId }`. Frontend confirms with Stripe Elements.

### 7.2 Webhook — Source of Truth
`POST /api/v1/webhooks/stripe` (raw body, signature verify with `STRIPE_WEBHOOK_SECRET`)

- `payment_intent.succeeded` → transaction: `Payment.status=COMPLETED, transactionId=pi_...` + `Booking.status=CONFIRMED` + enqueue confirmations. Idempotent: check `Payment.status` first; Stripe retries safely.
- `payment_intent.payment_failed` → `Payment.status=FAILED`, keep booking `PENDING`, notify customer to retry. Do NOT release slot yet (hold 15 min via `booking-hold-expiry` job, then auto-cancel if still unpaid).
- `charge.refunded` → `Payment.status=REFUNDED` + `Booking.status=REFUNDED` if applicable.

Always return `200` quickly (queue heavy work, don't block Stripe retries).

### 7.3 Hold Expiry (unpaid PENDING cleanup)
Job `booking-hold-expiry` every 5 min: find `PENDING` bookings older than 15 min with no `COMPLETED` payment → auto-cancel (`cancelledBy:SYSTEM, reason:PAYMENT_TIMEOUT`) + release slot + notify.

### 7.4 Refunds
`POST /api/v1/payments/:id/refund { amountCents?, reason }` (admin, or business if policy allows)
1. Load `Payment COMPLETED`. Validate refund amount <= captured.
2. Call Stripe `refunds.create`. On success: `Payment.status=REFUNDED (or PARTIAL via separate Refund rows for partial)` + update booking if full refund.
3. Audit log + notify customer. Stripe `charge.refunded` webhook reconciles final state.

---

## 8. Vehicles

- `GET/POST /api/v1/customers/me/vehicles` — owner only.
- `PATCH /api/v1/customers/me/vehicles/:id`, `DELETE` (soft? hard delete allowed if no future bookings reference it).
- Validation: `year` 1900..nextYear, `licensePlate` unique per customer, `type/size` enums.
- Business sees vehicle details only via bookings for their business (limited PII: make/model/year/color/type, NOT full customer history).

---

## 9. Reviews

**Endpoint:** `POST /api/v1/reviews { bookingId, rating 1..5, comment? }` (customer)

**Workflow:**
1. Validate booking `COMPLETED` + owned by caller + no existing review for booking (`bookingId unique`).
2. Optional 24h cooldown after completion before allowing review (encourage real experience, reduce impulsive).
3. Transaction: create `Review` + recompute `Business.rating = AVG(rating)` + `reviewCount++`. Use DB aggregate, not incremental float drift.
4. `PATCH /api/v1/reviews/:id` — edit within 7 days only.
5. Business response: `POST /api/v1/reviews/:id/response { response }` (owner of that business only, single response, editable).
6. Admin can hide (`isHidden=true`) on policy violation, never delete. Hidden reviews excluded from aggregates via filtered query + recompute.

---

## 10. Favorites

- `PUT /api/v1/customers/me/favorites/:businessId` — idempotent add (upsert on `@@unique([customerId,businessId])`).
- `DELETE ...` — remove. Idempotent.
- `GET /api/v1/customers/me/favorites` — list with business summary + next available slot.

---

## 11. Notifications (async, worker-owned)

**Channels:** email (SendGrid) MVP, push (web-push/VAPID) Phase 2, SMS (Twilio) optional for reminders.

**Pattern:** backend writes `Notification { userId, type, title, body, data, channel, status }` + enqueues job. Worker sends + updates `sentAt` + retries with backoff (3 attempts). Templates versioned in `modules/notification/templates/`.

**Triggers:**
| Event | Recipient | Channel | Delay |
|---|---|---|---|
| booking-created | customer + business | email+in-app | immediate |
| payment-succeeded | customer | email | immediate |
| booking-confirmed | customer | email | immediate |
| booking-cancelled | both | email | immediate |
| reminder-24h | customer | email/push | cron 24h before |
| reminder-2h | customer | push | cron 2h before |
| review-request | customer | email | 24h after COMPLETED |
| business-approved | owner | email | immediate |
| refund-processed | customer | email | immediate |

**Reminder job:** `send-reminders` cron every 15 min queries `CONFIRMED bookings where startTime in [now+24h ±15min]` without `reminder24hSent`, sends + marks sent (idempotent flag to avoid duplicates).

---

## 12. Admin Workflows

- `GET /api/v1/admin/dashboard` — aggregates: `bookingsToday, revenueMTD, activeBusinesses, pendingVerifications, refundRate`. Cache 60s, admin-only.
- `GET /api/v1/admin/users?role=&q=` — paginated, PII masked in logs.
- `PUT /api/v1/admin/users/:id/{activate|deactivate}` — deactivation revokes sessions (`tokenVersion++`) + cancels future customer bookings per policy.
- `GET /api/v1/admin/reports?from=&to=&businessId=` — CSV export via queued job (large reports async + S3 presigned URL, never inline huge CSV).
- All admin mutations write `AuditLog`.

---

## 13. Cross-Cutting Rules

### 13.1 RBAC Middleware Order
`authenticate → loadUser → check isActive → check role → check ownership (if :id scoped) → validate input → execute`. Ownership check helper: `requireOwner(businessId, session)` or `requireAdmin`.

### 13.2 Validation & Errors
- Zod schemas in `lib/validators/`. Coerce dates carefully (business timezone).
- Error envelope: `{ success:false, error:{ code, message, details? } }`. Stable codes: `VALIDATION_ERROR, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, SLOT_TAKEN, HAS_FUTURE_BOOKINGS, PAYMENT_FAILED, RATE_LIMITED`.
- 4xx logged as info, 5xx with Sentry + requestId (`X-Request-Id` echoed).

### 13.3 Rate Limiting (Redis)
- Global: 100 req/min/IP. Auth: 10/min. Booking create: 20/min/user. Webhooks: exempt but signature-required. Return `429 + Retry-After`.

### 13.4 Caching & Invalidation
- `slots:*` invalidated on booking create/cancel + template change.
- `business:{id}` invalidated on business/service update.
- `search:*` short TTL 60s. Never cache `bookings/*`, `payments/*`, `auth/me`.

### 13.5 Background Jobs Inventory
| Job | Queue | Schedule | Notes |
|---|---|---|---|
| `send-email` | notifications | on-demand | retry 3x backoff |
| `generate-slots` | scheduling | nightly + on change | idempotent upsert |
| `reconcile-future-slots` | scheduling | on hours change | never auto-cancel paid |
| `booking-hold-expiry` | bookings | every 5 min | 15 min hold |
| `send-reminders` | notifications | every 15 min | idempotent flags |
| `review-request` | notifications | delayed 24h | only if COMPLETED |
| `report-export` | reports | on-demand | S3 presigned URL |

Worker runs OUTSIDE Vercel (Fly/Railway) sharing Prisma schema + Redis. Vercel Cron only as trigger, not executor for long jobs.

### 13.6 Data Retention & Privacy
- PII access logged. `DELETE /api/v1/customers/me` → anonymize (hash email, clear name/phone) + keep financial records per tax retention (configurable 7y). GDPR export: `GET /api/v1/customers/me/export` → queued JSON dump.

---

## 14. MVP Build Order (Backend-First)

1. Auth + Users + IdempotencyKeys + AuditLog
2. Business onboarding + verification + AvailabilityTemplate + slot generation
3. Services + modifiers + price resolution
4. Slots query + Booking create (transaction + lock) + cancel + reminders stub
5. Payments (intent + webhook + hold expiry) + refunds
6. Reviews + Favorites + Search/geo
7. Notifications worker + Admin dashboard + reports
8. Hardening: rate limits, indexes, PgBouncer, Sentry, E2E concurrency tests

**Definition of done for booking:** parallel test with 10 concurrent `POST /bookings` to same 1-capacity slot yields exactly 1×201 + 9×409, `currentBookings==1`, cache invalidated, both parties notified.

---

## 15. Backend Project Structure — What Goes in Every File

Target runtime: Next.js App Router (Route Handlers) + Prisma + Redis + separate worker. This is the **backend-only view** — frontend pages/components are excluded on purpose so we never build blindly.

```
CarWash/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── middleware.ts
│   ├── app/
│   │   └── api/
│   │       └── v1/
│   │           ├── auth/
│   │           ├── businesses/
│   │           ├── bookings/
│   │           ├── customers/
│   │           ├── payments/
│   │           ├── reviews/
│   │           ├── search/
│   │           ├── admin/
│   │           └── webhooks/
│   ├── lib/
│   ├── modules/
│   ├── worker/
│   └── types/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── load/
├── .env.example
├── next.config.js
└── package.json
```

### 15.1 `prisma/` — source of truth for data

**`prisma/schema.prisma`** — implements §1-12 models: `User, Customer, Business, Vehicle, Service, PriceModifier, AvailabilityTemplate, TimeSlot, Booking, Payment, Refund, Review, Favorite, Notification, IdempotencyKey, VerificationToken, PasswordResetToken, AuditLog`. Holds `@@unique`, `@@index`, `onDelete` rules, enums (`UserRole, BookingStatus, PaymentStatus, VehicleType...`). Any workflow change starts here + `prisma migrate dev`.

**`prisma/migrations/`** — auto-generated SQL from `schema.prisma`. Never hand-edit except for data backfills + PostGIS extension (`CREATE EXTENSION postgis; pg_trgm;`) + GIST geo index. Reviewed in PRs.

**`prisma/seed.ts`** — idempotent dev seed: 1 admin, 2 businesses (1 verified, 1 pending), 5 services, 1 availability template + 7 days slots, 2 customers + vehicles, 3 bookings (PENDING/CONFIRMED/COMPLETED), 1 review. Run with `prisma db seed`. Used by integration tests.

### 15.2 `src/middleware.ts` — edge gatekeeper
Runs on every `/api/v1/*` request. Does: assign `X-Request-Id`, CORS for webhooks exclusion, Auth.js session check for protected routes, Redis rate-limit (`lib/rate-limit.ts`), maintenance-mode short-circuit. Never does DB writes here — only redirects/429/401.

### 15.3 `src/app/api/v1/` — thin HTTP adapters (no business logic)
Rule: each `route.ts` does only: parse → `validateWith(schema)` → `requireSession/requireRole` → call `modules/<domain>/service.ts` → `ok()/fail()` response. No Prisma calls directly in routes.

**`auth/register/route.ts`** — `POST` → §1.1. Calls `modules/auth/service.register()`, enqueues verification email.
**`auth/login/route.ts, auth/logout/route.ts, auth/me/route.ts`** — login (§1.2), logout idempotent, me hydrates `User+Customer/Business`.
**`auth/forgot-password/route.ts, auth/reset-password/route.ts, auth/verify-email/route.ts`** — token create/consume flows, always 200 on forgot to prevent enumeration.
**`businesses/route.ts`** — `GET` public search (§5) + `POST` create profile (§2.1).
**`businesses/[id]/route.ts`** — `GET` public detail (cached), `PATCH` owner/admin update (§2.3), invalidates `business:{id}` + `search:*`.
**`businesses/[id]/services/route.ts`** — `GET` public active list, `POST` owner create (§3.1).
**`businesses/[id]/services/[serviceId]/route.ts`** — `PATCH/DELETE` with `HAS_FUTURE_BOOKINGS` guard.
**`businesses/[id]/services/[serviceId]/modifiers/route.ts`** — `PUT` bulk upsert modifiers (§3.2).
**`businesses/[id]/availability/route.ts`** — `GET` public template summary + `PUT` owner update (§4.1), enqueues `generate-slots`.
**`businesses/[id]/slots/route.ts`** — `GET ?date=&serviceId=` (§4.4). Reads Redis `slots:{id}:{date}` or DB, filters by service duration.
**`businesses/[id]/bookings/route.ts`** — `GET` owner calendar view `?date=&status=` (§6.6). Includes customer+vehicle+service joins.
**`businesses/[id]/bookings/[bookingId]/route.ts`** — `PATCH {action: CONFIRM|START|COMPLETE|NO_SHOW}` (§6.3-6.4). Enforces state machine.
**`bookings/route.ts`** — `POST` create with `X-Idempotency-Key` (§6.2). The most critical handler — delegates to `modules/booking/service.createBookingTx()`.
**`bookings/preview/route.ts`** — `POST` price preview, no writes (§6.1).
**`bookings/[id]/route.ts`** — `GET` (owner parties or admin), `DELETE` cancel with policy (§6.5).
**`customers/me/vehicles/route.ts`** — `GET/POST` own vehicles (§8).
**`customers/me/vehicles/[vehicleId]/route.ts`** — `PATCH/DELETE` with future-booking guard.
**`customers/me/bookings/route.ts`** — `GET ?upcoming=&status=` customer history.
**`customers/me/favorites/route.ts`** — `GET` list (§10).
**`customers/me/favorites/[businessId]/route.ts`** — `PUT/DELETE` idempotent (§10).
**`payments/route.ts`** — `POST {bookingId}` create PaymentIntent (§7.1). Returns `clientSecret`.
**`payments/[id]/refund/route.ts`** — `POST` admin/owner refund (§7.4).
**`reviews/route.ts`** — `POST {bookingId, rating, comment}` (§9) + `GET ?businessId=` public list with pagination.
**`reviews/[id]/route.ts`** — `PATCH` edit within 7d, `DELETE` admin hide only.
**`reviews/[id]/response/route.ts`** — `POST` business single response.
**`search/businesses/route.ts`** — alias to `businesses/route.ts` filtering or dedicated geo handler (§5). Kept separate to allow Meilisearch swap later without touching CRUD.
**`admin/dashboard/route.ts`** — `GET` cached aggregates (§12).
**`admin/users/route.ts, admin/users/[id]/route.ts`** — list + activate/deactivate with `tokenVersion++`.
**`admin/businesses/route.ts, admin/businesses/[id]/verify/route.ts`** — pending queue + APPROVE/REJECT (§2.2).
**`admin/bookings/route.ts, admin/reports/route.ts`** — all-bookings filters + async CSV export (returns `jobId`, not file).
**`webhooks/stripe/route.ts`** — `POST` raw body, `stripe.webhooks.constructEvent` verify, switch on `payment_intent.succeeded/failed`, `charge.refunded` (§7.2). Must return 200 fast, queue heavy work.

### 15.4 `src/lib/` — shared plumbing (no domain rules)

**`lib/db.ts`** — singleton PrismaClient with PgBouncer-friendly pool (`connection_limit=5` on serverless). Exports `db`. Handles `globalThis` caching in dev.
**`lib/redis.ts`** — ioredis/Upstash client singleton. Exports `redis`. Used by cache + rate-limit + queues.
**`lib/auth.ts`** — Auth.js v5 config: providers (credentials + OAuth), callbacks attaching `role, tokenVersion`, `requireSession()`, `requireRole('ADMIN'|'BUSINESS'|'CUSTOMER')`, `requireOwner(businessId)` helpers used by all routes.
**`lib/password.ts`** — `hashPassword()`, `verifyPassword()` (bcrypt 12). Nothing else touches passwords.
**`lib/tokens.ts`** — `createVerificationToken()`, `createPasswordResetToken()`, `consumeToken()` single-use logic (§1).
**`lib/validators/`** — one Zod file per domain, imported by routes AND services:
- `auth.schema.ts` — register/login/reset shapes, password rules.
- `business.schema.ts` — create/patch, operatingHours typed schema.
- `service.schema.ts` — basePriceCents>0, duration enum.
- `availability.schema.ts` — slotLength/buffer/maxParallel/weekly windows validation.
- `booking.schema.ts` — date `YYYY-MM-DD`, time `HH:mm`, future-date check.
- `payment.schema.ts`, `review.schema.ts` (rating 1-5 int), `vehicle.schema.ts` (year range, plate regex).
**`lib/errors.ts`** — `fail(code, message, status, details)` + stable codes (`SLOT_TAKEN, HAS_FUTURE_BOOKINGS...`), `ok(data, meta)`, Sentry capture for 5xx.
**`lib/pagination.ts`** — cursor/offset helpers: `parseCursor()`, `buildPaginatedResponse(data, nextCursor)`.
**`lib/rate-limit.ts`** — `checkRateLimit({key, limit, windowSec})` via Redis INCR+EXPIRE, used in `middleware.ts` + booking/payment routes.
**`lib/cache.ts`** — `getCached/setCached/invalidate(pattern)` wrappers with key builders `slotsKey(), businessKey(), searchKey()`.
**`lib/time.ts`** — timezone-safe helpers: `toUTC(date, time, tz)`, `isWithinWindow()`, `addMinutes()`, `isFreeCancel(startAt)`. All booking logic uses this — never raw `Date`.
**`lib/money.ts`** — cents↔Decimal conversion, `resolvePrice(base, modifiers)` (§3.2), rounding.
**`lib/geo.ts`** — server-side geocode wrapper + `ST_DWithin` query builder (§5). Mocks in tests.
**`lib/stripe.ts`** — Stripe SDK singleton, `createPaymentIntent()`, `createRefund()`, `verifyWebhookSignature()`.
**`lib/email.ts`** — SendGrid wrapper `sendEmail({to, template, data})`. Called only from worker, never routes.
**`lib/idempotency.ts`** — `checkOrStore(key, userId, response)` used by booking/payment (§6.2). TTL 24h.
**`lib/audit.ts`** — `writeAudit({actorId, action, entityType, entityId, metadata})` for admin + financial mutations.
**`lib/logger.ts`** — pino logger with `requestId` child, PII redaction.

### 15.5 `src/modules/` — domain logic (the real workflows)

Each module owns its service + data access. Routes never cross modules directly — e.g., booking service calls `pricing.resolve()` and `notifications.enqueue()`, not DB tables of other domains ad hoc.

**`modules/auth/service.ts`** — `register(), login(), verifyEmail(), requestReset(), resetPassword()`. Owns bcrypt + tokenVersion + fail-counter logic (§1).
**`modules/business/service.ts + repository.ts`** — `createProfile(), updateProfile(), verify(), getPublicDetail(), listSearch()` (§2, §5). Repository holds PostGIS + full-text queries.
**`modules/service-pricing/service.ts`** — `create(), update(), softDeleteWithGuard(), upsertModifiers(), resolvePrice()` (§3). Guard queries future CONFIRMED count before delete.
**`modules/availability/service.ts + slots.ts`** — `updateTemplate(), generateSlots(businessId, horizon)`, `reconcile()`, `getSlotsForDate()` (§4). `slots.ts` holds slicing algorithm (window → chunks).
**`modules/booking/service.ts`** — `preview(), createBookingTx(), confirm(), start(), complete(), cancel(), getForCustomer(), getForBusiness()` (§6). `createBookingTx()` is the transactional core: idempotency → validate → `FOR UPDATE` lock → price → create → increment → outbox event. `transitions.ts` in same folder enforces state machine map.
**`modules/payment/service.ts + stripe.ts`** — `createIntent(), handleWebhookEvent(), refund()` (§7). Webhook handler is idempotent on `Payment.status`.
**`modules/vehicle/service.ts`** — CRUD with plate-unique + future-booking guard (§8).
**`modules/review/service.ts`** — `create(), edit(), respond(), hide()`, `recomputeRating(businessId)` via `AVG` (§9).
**`modules/favorite/service.ts`** — upsert/delete/list (§10).
**`modules/notification/service.ts + templates/`** — `enqueue(type, userId, data)`, `sendDue()`, `markSent()`. `templates/*.ts` hold subject/body builders per trigger (§11). No sending in request cycle.
**`modules/admin/service.ts`** — dashboard aggregates, user activate/deactivate, report export job creator (§12).
**`modules/search/service.ts`** — builds cache key, delegates geo/text to `business/repository.ts` (§5).

### 15.6 `src/worker/` — runs OUTSIDE Vercel (Fly/Railway)

**`worker/index.ts`** — BullMQ connection (Redis), registers all processors, graceful shutdown, Sentry init.
**`worker/queues.ts`** — queue definitions + names: `notifications, scheduling, bookings, reports`. Exports typed `enqueue(job)`.
**`worker/jobs/send-email.ts`** — reads `Notification` row, calls `lib/email.ts`, updates `sentAt`, retry 3x backoff (§11).
**`worker/jobs/generate-slots.ts`** — nightly + on-demand (§4.2). Idempotent upsert.
**`worker/jobs/reconcile-slots.ts`** — (§4.3). Never auto-cancels paid.
**`worker/jobs/booking-hold-expiry.ts`** — every 5 min (§7.3).
**`worker/jobs/send-reminders.ts`** — every 15 min with `reminder24hSent/reminder2hSent` flags (§11).
**`worker/jobs/review-request.ts`** — delayed 24h after COMPLETED (§9).
**`worker/jobs/report-export.ts`** — streams DB → CSV → S3, returns presigned URL (§12).
**`worker/cron.ts`** — node-cron or Trigger.dev schedules wiring the above intervals. Vercel Cron only hits a lightweight `/api/v1/cron/trigger` that enqueues — never executes long work.

### 15.7 `src/types/` — shared contracts
**`types/api.ts`** — `ApiSuccess<T>, ApiError, Paginated<T>` envelope (§13.2). **DO NOT** duplicate Prisma types — import from `@prisma/client`. **`types/domain.ts`** — `BookingAction, CancelPolicy, SlotDTO, PriceBreakdown` used by both routes and worker.

### 15.8 `tests/` — proves the workflows
**`unit/`** — `pricing.test.ts` (multiplier math), `slots.test.ts` (window slicing), `transitions.test.ts` (illegal PENDING→COMPLETED rejected), `validators.test.ts`.
**`integration/`** — `booking-concurrency.test.ts` (10 parallel POST → 1×201 + 9×409, the DoD in §14), `payment-webhook.test.ts` (Stripe signature mock → CONFIRMED), `cancel-refund.test.ts`, `auth.test.ts`.
**`load/`** — k6 script `slot-race.js` for staging soak.

### 15.9 Root configs
**`.env.example`** — documents every var from ARCHITECTURE §9: `DATABASE_URL (pooled), DIRECT_URL, REDIS_URL, NEXTAUTH_SECRET, STRIPE_*, GOOGLE_MAPS_KEY, SENDGRID_KEY, S3_* , SENTRY_DSN`. No real secrets in repo.
**`next.config.js`** — `experimental.serverActions` off for API purity, `headers()` for HSTS/CSP, `images.remotePatterns` for S3 logos.
**`package.json`** — scripts: `dev, build, start, db:migrate, db:seed, worker, test, test:integration, lint, typecheck`. Pins `node>=20`, `prisma, zod, stripe, ioredis, bullmq`.

**Build rule:** implement in §14 order. A file is done only when its route validates → authorizes → delegates to module service → covered by a test in `tests/`. If logic lives in `route.ts` instead of `modules/*/service.ts`, it's in the wrong place.

---

*Last Updated: September 2026 · Status: Backend workflow spec v1.1 — workflows + file map ready for scaffolding.*

