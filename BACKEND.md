# CarWash Backend Workflows

> Companion to `ARCHITECTURE.md` v1.0 and `OVERVIEW.md`.
> This document defines **how the backend behaves**, step-by-step, for a NestJS backend + Prisma + PostgreSQL + Redis + separate worker.
> No frontend logic here — only API contracts, state transitions, invariants, and failure handling.

**Conventions used in this doc:**
- Base path: `/api/v1/...`
- Auth: Passport.js JWT strategy, httpOnly cookie or Bearer token. `X-Idempotency-Key: <uuid>` required on `POST /bookings` and `POST /payments`.
- All mutating workflows run input validation (class-validator/Zod) → auth guard → RBAC guard → transaction → side-effects via outbox/queue.
- Money in minor units (cents) internally, `Decimal(10,2)` at rest. Currency default `USD` (configurable per business later).
- Times stored in UTC. Business timezone stored on `Business.timezone`. Client sends `date: YYYY-MM-DD` + `startTime: HH:mm` in business local time; backend converts to UTC for storage/comparison.
- Soft delete: `isActive=false` + `deletedAt`. Never hard-delete Users, Businesses, Bookings, Payments.

---

## 0. Features by Role

> This section defines **exactly what each role can do**. Build from this list — nothing else, nothing less.

### 0.1 Customer Features

#### Authentication & Profile
| Feature | Endpoint | Description |
|---------|----------|-------------|
| Register | `POST /auth/register` | Create account with email + password, role=CUSTOMER |
| Login | `POST /auth/login` | Email + password, receive JWT |
| Logout | `POST /auth/logout` | Invalidate session |
| Forgot Password | `POST /auth/forgot-password` | Request reset email |
| Reset Password | `POST /auth/reset-password` | Set new password via token |
| Verify Email | `POST /auth/verify-email` | Confirm email address |
| Get Profile | `GET /auth/me` | Current user + customer data |
| Update Profile | `PATCH /auth/profile` | Update name, phone |

#### Vehicles
| Feature | Endpoint | Description |
|---------|----------|-------------|
| List Vehicles | `GET /customers/me/vehicles` | All my vehicles |
| Add Vehicle | `POST /customers/me/vehicles` | Create vehicle (make, model, year, type, size, plate) |
| Update Vehicle | `PATCH /customers/me/vehicles/:id` | Edit vehicle details |
| Delete Vehicle | `DELETE /customers/me/vehicles/:id` | Remove vehicle (blocked if future bookings) |

#### Bookings
| Feature | Endpoint | Description |
|---------|----------|-------------|
| Preview Price | `POST /bookings/preview` | Calculate price before booking (no commitment) |
| Create Booking | `POST /bookings` | Book a service slot (idempotent) |
| List My Bookings | `GET /customers/me/bookings` | Past + upcoming, filterable by status |
| Get Booking | `GET /bookings/:id` | Booking detail (own only) |
| Cancel Booking | `DELETE /bookings/:id` | Cancel with policy check (24h rule) |

#### Favorites
| Feature | Endpoint | Description |
|---------|----------|-------------|
| List Favorites | `GET /customers/me/favorites` | Saved businesses |
| Add Favorite | `PUT /customers/me/favorites/:businessId` | Save business (idempotent) |
| Remove Favorite | `DELETE /customers/me/favorites/:businessId` | Unsave business |

#### Reviews
| Feature | Endpoint | Description |
|---------|----------|-------------|
| Create Review | `POST /reviews` | Rate 1-5 + comment (only COMPLETED bookings) |
| Edit Review | `PATCH /reviews/:id` | Edit within 7 days |
| Delete Review | `DELETE /reviews/:id` | Admin only (customer cannot delete) |

#### Search & Browse
| Feature | Endpoint | Description |
|---------|----------|-------------|
| Search Businesses | `GET /businesses?query=&lat=&lng=&radiusKm=` | Geo + text search |
| View Business | `GET /businesses/:id` | Business detail, services, hours |
| View Services | `GET /businesses/:id/services` | Active services with prices |
| View Slots | `GET /businesses/:id/slots?date=&serviceId=` | Available time slots |

---

### 0.2 Business Features

#### Authentication & Profile
| Feature | Endpoint | Description |
|---------|----------|-------------|
| Register | `POST /auth/register` | Create account, role=BUSINESS |
| Login | `POST /auth/login` | Email + password |
| Logout | `POST /auth/logout` | Invalidate session |
| Forgot/Reset Password | `POST /auth/forgot-password` | Same as customer |
| Verify Email | `POST /auth/verify-email` | Confirm email |
| Get Profile | `GET /auth/me` | Current user + business data |

#### Business Profile Management
| Feature | Endpoint | Description |
|---------|----------|-------------|
| Create Business | `POST /businesses` | Set up business profile (name, address, location, hours) |
| Update Business | `PATCH /businesses/:id` | Edit profile (owner only) |
| View My Business | `GET /businesses/:id` | Full business detail |
| Upload Logo | `PATCH /businesses/:id` | Update logo image |
| Set Operating Hours | `PUT /businesses/:id/availability` | Weekly schedule + blackouts |

#### Service Management
| Feature | Endpoint | Description |
|---------|----------|-------------|
| List Services | `GET /businesses/:id/services` | All services (active + inactive) |
| Create Service | `POST /businesses/:id/services` | Add service (name, category, price, duration) |
| Update Service | `PATCH /businesses/:id/services/:id` | Edit service (future bookings only) |
| Delete Service | `DELETE /businesses/:id/services/:id` | Soft delete (blocked if future bookings) |
| Set Price Modifiers | `PUT /businesses/:id/services/:id/modifiers` | Vehicle type/size pricing rules |

#### Availability & Slots
| Feature | Endpoint | Description |
|---------|----------|-------------|
| Get Template | `GET /businesses/:id/availability` | Current availability rules |
| Update Template | `PUT /businesses/:id/availability` | Change schedule (triggers slot regeneration) |
| View Slots | `GET /businesses/:id/slots?date=` | See generated slots for a date |

#### Booking Management
| Feature | Endpoint | Description |
|---------|----------|-------------|
| List Bookings | `GET /businesses/:id/bookings?date=&status=` | Calendar view |
| Get Booking | `GET /businesses/:id/bookings/:id` | Booking detail with customer + vehicle |
| Confirm Booking | `PATCH /businesses/:id/bookings/:id` | Accept pay-at-location booking |
| Start Service | `PATCH /businesses/:id/bookings/:id` | Mark IN_PROGRESS |
| Complete Service | `PATCH /businesses/:id/bookings/:id` | Mark COMPLETED |
| Mark No-Show | `PATCH /businesses/:id/bookings/:id` | Mark customer no-show |

#### Reviews & Reputation
| Feature | Endpoint | Description |
|---------|----------|-------------|
| View Reviews | `GET /businesses/:id/reviews` | All reviews for my business |
| Respond to Review | `POST /reviews/:id/response` | Single response per review |

#### Analytics (MVP)
| Feature | Endpoint | Description |
|---------|----------|-------------|
| Dashboard Stats | `GET /businesses/:id/analytics` | Bookings today, revenue MTD, ratings |

---

### 0.3 Admin Features

#### Authentication
| Feature | Endpoint | Description |
|---------|----------|-------------|
| Login | `POST /auth/login` | Admin login (no public registration) |
| Logout | `POST /auth/logout` | Invalidate session |

#### Platform Dashboard
| Feature | Endpoint | Description |
|---------|----------|-------------|
| Dashboard | `GET /admin/dashboard` | bookingsToday, revenueMTD, activeBusinesses, pendingVerifications, refundRate |

#### User Management
| Feature | Endpoint | Description |
|---------|----------|-------------|
| List Users | `GET /admin/users?role=&q=` | Paginated user list |
| Get User | `GET /admin/users/:id` | User detail |
| Activate User | `PUT /admin/users/:id/activate` | Reactivate account |
| Deactivate User | `PUT /admin/users/:id/deactivate` | Revoke sessions + cancel future bookings |

#### Business Management
| Feature | Endpoint | Description |
|---------|----------|-------------|
| List Businesses | `GET /admin/businesses` | All businesses (pending, approved, rejected) |
| Get Business | `GET /admin/businesses/:id` | Business detail |
| Verify Business | `PUT /admin/businesses/:id/verify` | APPROVE or REJECT with reason |
| Deactivate Business | `PUT /admin/businesses/:id/deactivate` | Hide from search, notify owner |

#### Booking Management
| Feature | Endpoint | Description |
|---------|----------|-------------|
| List All Bookings | `GET /admin/bookings?date=&status=&businessId=` | Platform-wide bookings |
| Get Booking | `GET /admin/bookings/:id` | Any booking detail |
| Cancel Booking | `DELETE /admin/bookings/:id` | Admin override cancel |
| Process Refund | `POST /payments/:id/refund` | Full or partial refund |

#### Reviews Moderation
| Feature | Endpoint | Description |
|---------|----------|-------------|
| List Flagged Reviews | `GET /admin/reviews?flagged=true` | Reviews needing attention |
| Hide Review | `PATCH /reviews/:id/hide` | Hide policy-violating review |

#### Reports & Audit
| Feature | Endpoint | Description |
|---------|----------|-------------|
| Generate Report | `GET /admin/reports?from=&to=&businessId=` | CSV export (async, S3 presigned URL) |
| View Audit Log | `GET /admin/audit?entity=&action=` | All admin + financial mutations logged |

---

### 0.4 Shared / Public Features (No Auth Required)
| Feature | Endpoint | Description |
|---------|----------|-------------|
| View Business | `GET /businesses/:id` | Public business profile |
| View Services | `GET /businesses/:id/services` | Active services with prices |
| View Slots | `GET /businesses/:id/slots?date=&serviceId=` | Available time slots |
| Search Businesses | `GET /businesses?query=&lat=&lng=` | Geo + text search |
| View Reviews | `GET /businesses/:id/reviews` | Public reviews with rating |
| Stripe Webhook | `POST /webhooks/stripe` | Payment event receiver |

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
2. Validate address + geocode server-side (Nominatim/OSM) — do NOT trust client lat/lng blindly. If geocode fails, accept manual coords but flag `geoConfidence=low`.
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

**Channels:** email (Mailgun) MVP, SMS (MNotify) for reminders, push (web-push/VAPID) Phase 2.

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

**Reminder job:** `send-reminders` cron every 15 min queries `CONFIRMED bookings where startTime in [now+24h ±15min]` without `reminder24hSent`, sends email (Mailgun) + SMS (MNotify) + marks sent (idempotent flag to avoid duplicates).

---

## 12. Admin Workflows

- `GET /api/v1/admin/dashboard` — aggregates: `bookingsToday, revenueMTD, activeBusinesses, pendingVerifications, refundRate`. Cache 60s, admin-only.
- `GET /api/v1/admin/users?role=&q=` — paginated, PII masked in logs.
- `PUT /api/v1/admin/users/:id/{activate|deactivate}` — deactivation revokes sessions (`tokenVersion++`) + cancels future customer bookings per policy.
- `GET /api/v1/admin/reports?from=&to=&businessId=` — CSV export via queued job (large reports async + Cloudflare R2 presigned URL, never inline huge CSV).
- All admin mutations write `AuditLog`.

---

## 13. Cross-Cutting Rules

### 13.1 RBAC Guard Order (NestJS)
`JwtAuthGuard → RolesGuard → OwnershipGuard → ThrottlerGuard → ValidationPipe → execute`. Ownership check via `@CurrentUser()` decorator + `requireOwner(businessId, user)` helper.

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

Worker runs on Railway (separate process) sharing Prisma schema + Redis. Railway cron triggers the worker — never executes long work in the main API process.

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

Target runtime: NestJS backend + Prisma + Redis + BullMQ worker (separate process). This is the **backend-only view** — frontend pages/components are excluded on purpose so we never build blindly.

```
CarWash-Backend/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── main.ts                      # NestJS bootstrap
│   ├── app.module.ts                # Root module
│   ├── auth/                        # Auth feature module
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── dto/
│   │   ├── entities/
│   │   ├── guards/
│   │   └── strategies/
│   ├── business/                    # Business feature module
│   │   ├── business.module.ts
│   │   ├── business.controller.ts
│   │   ├── business.service.ts
│   │   ├── business.repository.ts
│   │   ├── dto/
│   │   └── entities/
│   ├── booking/                     # Booking feature module
│   │   ├── booking.module.ts
│   │   ├── booking.controller.ts
│   │   ├── booking.service.ts
│   │   ├── transitions.ts
│   │   ├── dto/
│   │   └── entities/
│   ├── payment/                     # Payment feature module
│   │   ├── payment.module.ts
│   │   ├── payment.controller.ts
│   │   ├── payment.service.ts
│   │   ├── dto/
│   │   └── entities/
│   ├── review/                      # Review feature module
│   │   ├── review.module.ts
│   │   ├── review.controller.ts
│   │   ├── review.service.ts
│   │   ├── dto/
│   │   └── entities/
│   ├── search/                      # Search feature module
│   │   ├── search.module.ts
│   │   ├── search.controller.ts
│   │   └── search.service.ts
│   ├── notification/                # Notification feature module
│   │   ├── notification.module.ts
│   │   ├── notification.service.ts
│   │   └── templates/
│   ├── admin/                       # Admin feature module
│   │   ├── admin.module.ts
│   │   ├── admin.controller.ts
│   │   ├── admin.service.ts
│   │   └── dto/
│   ├── webhooks/                    # Webhook handlers
│   │   ├── webhooks.module.ts
│   │   └── webhooks.controller.ts
│   ├── libs/                        # Shared libraries
│   │   ├── prisma/
│   │   ├── redis/
│   │   ├── auth/
│   │   ├── common/
│   │   │   ├── guards/
│   │   │   ├── interceptors/
│   │   │   ├── filters/
│   │   │   ├── pipes/
│   │   │   └── decorators/
│   │   ├── config/
│   │   ├── email/
│   │   ├── sms/
│   │   ├── stripe/
│   │   ├── geo/
│   │   ├── cache/
│   │   ├── money/
│   │   ├── time/
│   │   ├── idempotency/
│   │   ├── audit/
│   │   └── logger/
│   ├── worker/                      # BullMQ worker (separate process)
│   │   ├── worker.module.ts
│   │   ├── main.ts
│   │   ├── queues/
│   │   └── processors/
│   └── types/                       # Shared contracts
│       ├── api.ts
│       └── domain.ts
├── test/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── load/
├── .env.example
├── nest-cli.json
├── tsconfig.json
└── package.json
```

### 15.1 `prisma/` — source of truth for data

**`prisma/schema.prisma`** — implements §1-12 models: `User, Customer, Business, Vehicle, Service, PriceModifier, AvailabilityTemplate, TimeSlot, Booking, Payment, Refund, Review, Favorite, Notification, IdempotencyKey, VerificationToken, PasswordResetToken, AuditLog`. Holds `@@unique`, `@@index`, `onDelete` rules, enums (`UserRole, BookingStatus, PaymentStatus, VehicleType...`). Any workflow change starts here + `prisma migrate dev`.

**`prisma/migrations/`** — auto-generated SQL from `schema.prisma`. Never hand-edit except for data backfills + PostGIS extension (`CREATE EXTENSION postgis; pg_trgm;`) + GIST geo index. Reviewed in PRs.

**`prisma/seed.ts`** — idempotent dev seed: 1 admin, 2 businesses (1 verified, 1 pending), 5 services, 1 availability template + 7 days slots, 2 customers + vehicles, 3 bookings (PENDING/CONFIRMED/COMPLETED), 1 review. Run with `prisma db seed`. Used by integration tests.

### 15.2 `src/main.ts` — NestJS bootstrap + global config
Bootstraps NestJS app with: `ValidationPipe` (global), `HttpExceptionFilter` (global), `TransformInterceptor` (global), CORS enabled, `@nestjs/throttler` rate limiting, Swagger docs at `/api/docs`. Applies guards in order: `JwtAuthGuard → RolesGuard → OwnershipGuard → ThrottlerGuard`.

### 15.3 `src/` — NestJS controllers, services, modules

Rule: each controller does only: parse → `ValidationPipe` → `@UseGuards(JwtAuthGuard, RolesGuard)` → call `service.method()` → return response. No Prisma calls directly in controllers.

**`auth/auth.controller.ts`** — `POST /register` → §1.1, `POST /login` → §1.2, `POST /logout`, `GET /me`, `POST /forgot-password`, `POST /reset-password`, `POST /verify-email`.
**`business/business.controller.ts`** — `POST /` create profile (§2.1), `GET /:id` public detail, `PATCH /:id` owner update (§2.3).
**`business/business.controller.ts`** — `GET /:id/services` public list, `POST /:id/services` owner create (§3.1), `PATCH /:id/services/:serviceId`, `DELETE /:id/services/:serviceId`.
**`business/business.controller.ts`** — `PUT /:id/availability` owner update (§4.1), `GET /:id/slots?date=&serviceId=` (§4.4).
**`business/business.controller.ts`** — `GET /:id/bookings` owner calendar, `PATCH /:id/bookings/:bookingId` status transitions (§6.3-6.4).
**`booking/booking.controller.ts`** — `POST /` create with `@Headers('x-idempotency-key')` (§6.2), `POST /preview` price preview (§6.1), `GET /:id` detail, `DELETE /:id` cancel (§6.5).
**`customer/customer.controller.ts`** — `GET /me/vehicles`, `POST /me/vehicles`, `PATCH /me/vehicles/:id`, `DELETE /me/vehicles/:id` (§8). `GET /me/bookings` (§6.6). `GET /me/favorites`, `PUT /me/favorites/:businessId`, `DELETE /me/favorites/:businessId` (§10).
**`payment/payment.controller.ts`** — `POST /` create PaymentIntent (§7.1), `POST /:id/refund` admin/owner refund (§7.4).
**`review/review.controller.ts`** — `POST /` create (§9), `GET ?businessId=` public list, `PATCH /:id` edit within 7d, `POST /:id/response` business response.
**`search/search.controller.ts`** — `GET /businesses` geo + text search (§5).
**`admin/admin.controller.ts`** — `GET /dashboard` (§12), `GET /users`, `PUT /users/:id/activate|deactivate`, `GET /businesses`, `PUT /businesses/:id/verify` (§2.2), `GET /bookings`, `GET /reports`.
**`webhooks/webhooks.controller.ts`** — `POST /stripe` raw body, signature verify, switch on event type (§7.2). Must return 200 fast, queue heavy work.

### 15.4 `src/libs/` — shared plumbing (NestJS modules, no domain rules)

**`libs/prisma/prisma.module.ts`** — `@Global()` module exporting `PrismaService`. Imported once in `AppModule`.
**`libs/prisma/prisma.service.ts`** — extends `PrismaClient` with `enableShutdownHooks()`, connection pooling, PgBouncer-friendly config (`connection_limit=5`).
**`libs/redis/redis.module.ts`** — `@Global()` module exporting `RedisService`. Wraps ioredis/Upstash.
**`libs/redis/redis.service.ts`** — `get/set/del/incr/expire` wrappers. Used by cache + rate-limit + queues.
**`libs/common/guards/jwt-auth.guard.ts`** — validates JWT from cookie or Bearer header, attaches `user` to request.
**`libs/common/guards/roles.guard.ts`** — checks `@Roles('ADMIN'|'BUSINESS'|'CUSTOMER')` decorator against `user.role`.
**`libs/common/guards/ownership.guard.ts`** — checks `user.id` owns the resource (business, booking, vehicle).
**`libs/common/guards/rate-limit.guard.ts`** — NestJS ThrottlerGuard with Redis store, per-route limits.
**`libs/common/interceptors/transform.interceptor.ts`** — wraps response in `{ success: true, data }` envelope.
**`libs/common/interceptors/logging.interceptor.ts`** — logs request/response with `requestId`, PII redaction.
**`libs/common/filters/http-exception.filter.ts`** — catches exceptions, returns `{ success: false, error: { code, message, details } }` envelope, sends 5xx to Sentry.
**`libs/common/decorators/current-user.decorator.ts`** — `@CurrentUser()` parameter decorator to extract user from request.
**`libs/common/decorators/roles.decorator.ts`** — `@Roles('ADMIN')` metadata decorator for RBAC.
**`libs/common/pipes/validation.pipe.ts`** — global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true, transform: true`.
**`libs/config/config.module.ts`** — `@nestjs/config` with `.env` validation via Joi/Zod.
**`libs/auth/auth.module.ts`** — `PassportModule` + `JwtModule` registration, `JwtStrategy`, exports `AuthService`.
**`libs/auth/auth.service.ts`** — `register(), login(), verifyEmail(), requestReset(), resetPassword()`. Owns bcrypt + tokenVersion + fail-counter logic (§1).
**`libs/auth/jwt.strategy.ts`** — extracts JWT from cookie/header, validates, returns `user` payload.
**`libs/password/password.service.ts`** — `hashPassword()`, `verifyPassword()` (bcrypt 12). Nothing else touches passwords.
**`libs/tokens/token.service.ts`** — `createVerificationToken()`, `createPasswordResetToken()`, `consumeToken()` single-use logic (§1).
**`libs/money/money.service.ts`** — cents↔Decimal conversion, `resolvePrice(base, modifiers)` (§3.2), rounding.
**`libs/time/time.service.ts`** — timezone-safe helpers: `toUTC(date, time, tz)`, `isWithinWindow()`, `addMinutes()`, `isFreeCancel(startAt)`.
**`libs/geo/geo.service.ts`** — Nominatim geocoding wrapper + `ST_DWithin` query builder (§5). Uses OpenStreetMap (free, no API key).
**`libs/stripe/stripe.service.ts`** — Stripe SDK, `createPaymentIntent()`, `createRefund()`, `verifyWebhookSignature()`.
**`libs/email/email.service.ts`** — Mailgun wrapper `sendEmail({to, template, data})`. Called only from worker, never controllers.
**`libs/sms/sms.service.ts`** — MNotify wrapper `sendSMS({to, message})`. Called only from worker for reminders.
**`libs/cache/cache.service.ts`** — `getCached/setCached/invalidate(pattern)` wrappers with key builders `slotsKey(), businessKey(), searchKey()`.
**`libs/idempotency/idempotency.service.ts`** — `checkOrStore(key, userId, response)` used by booking/payment (§6.2). TTL 24h.
**`libs/audit/audit.service.ts`** — `writeAudit({actorId, action, entityType, entityId, metadata})` for admin + financial mutations.
**`libs/logger/logger.service.ts`** — pino/logger with `requestId` child, PII redaction.

### 15.5 `src/` — feature modules (the real workflows)

Each module owns its controller + service + DTOs. Controllers never contain business logic — they delegate to services. Services call other services (not other modules' repositories directly).

**`auth/auth.module.ts`** — imports `PassportModule`, `JwtModule`, `PrismaModule`. Exports `AuthService`.
**`auth/auth.controller.ts`** — `POST /register`, `POST /login`, `POST /logout`, `GET /me`, `POST /forgot-password`, `POST /reset-password`, `POST /verify-email`. §1.
**`auth/auth.service.ts`** — `register(), login(), verifyEmail(), requestReset(), resetPassword()`. Owns bcrypt + tokenVersion + fail-counter logic (§1).
**`auth/dto/register.dto.ts`** — `class-validator` decorators: `@IsEmail()`, `@MinLength(8)`, `@IsIn(['CUSTOMER','BUSINESS'])`.
**`auth/strategies/jwt.strategy.ts`** — validates JWT, returns `{ userId, email, role }`.
**`auth/guards/jwt-auth.guard.ts`** — extends `AuthGuard('jwt')`, attaches `user` to request.
**`auth/guards/roles.guard.ts`** — checks `@Roles()` metadata against `user.role`.

**`business/business.module.ts`** — imports `PrismaModule`, `CacheModule`. Exports `BusinessService`.
**`business/business.controller.ts`** — `POST /` create profile (§2.1), `GET /:id` public detail (cached), `PATCH /:id` owner update (§2.3).
**`business/business.service.ts`** — `createProfile(), updateProfile(), verify(), getPublicDetail(), listSearch()` (§2, §5).
**`business/business.repository.ts`** — PostGIS + full-text queries, cache invalidation.

**`booking/booking.module.ts`** — imports `PrismaModule`, `CacheModule`, `NotificationModule`, `PaymentModule`. Exports `BookingService`.
**`booking/booking.controller.ts`** — `POST /` create with idempotency key (§6.2), `POST /preview` (§6.1), `GET /:id`, `DELETE /:id` cancel (§6.5).
**`booking/booking.service.ts`** — `preview(), createBookingTx(), confirm(), start(), complete(), cancel(), getForCustomer(), getForBusiness()` (§6). `createBookingTx()` is the transactional core: idempotency → validate → `FOR UPDATE` lock → price → create → increment → outbox event.
**`booking/transitions.ts`** — state machine map enforcing valid transitions (PENDING→CONFIRMED→IN_PROGRESS→COMPLETED, CANCELLED, REFUNDED).

**`payment/payment.module.ts`** — imports `PrismaModule`, `StripeModule`. Exports `PaymentService`.
**`payment/payment.controller.ts`** — `POST /` create PaymentIntent (§7.1), `POST /:id/refund` admin/owner refund (§7.4).
**`payment/payment.service.ts`** — `createIntent(), handleWebhookEvent(), refund()` (§7). Webhook handler is idempotent on `Payment.status`.

**`review/review.module.ts`** — imports `PrismaModule`. Exports `ReviewService`.
**`review/review.controller.ts`** — `POST /` create (§9), `GET ?businessId=` public list, `PATCH /:id` edit within 7d, `POST /:id/response` business response.
**`review/review.service.ts`** — `create(), edit(), respond(), hide()`, `recomputeRating(businessId)` via `AVG` (§9).

**`search/search.module.ts`** — imports `PrismaModule`, `CacheModule`. Exports `SearchService`.
**`search/search.controller.ts`** — `GET /businesses` geo + text search (§5).
**`search/search.service.ts`** — builds cache key, delegates geo/text to `business.repository.ts` (§5).

**`notification/notification.module.ts`** — imports `PrismaModule`, `EmailModule`, `SmsModule`. Exports `NotificationService`.
**`notification/notification.service.ts`** — `enqueue(type, userId, data)`, `sendDue()`, `markSent()`.
**`notification/templates/`** — `*.ts` files hold subject/body builders per trigger (§11). No sending in request cycle.

**`admin/admin.module.ts`** — imports `PrismaModule`, `CacheModule`. Exports `AdminService`.
**`admin/admin.controller.ts`** — `GET /dashboard` (§12), `GET /users`, `PUT /users/:id/activate|deactivate`, `GET /businesses`, `PUT /businesses/:id/verify` (§2.2), `GET /bookings`, `GET /reports`.
**`admin/admin.service.ts`** — dashboard aggregates, user activate/deactivate, report export job creator (§12).

### 15.6 `src/worker/` — runs OUTSIDE Vercel (Railway, separate process)

**`worker/worker.module.ts`** — NestJS module importing `PrismaModule`, `RedisModule`, `EmailModule`, `SmsModule`, all processor classes.
**`worker/main.ts`** — bootstrap NestJS app, connect BullMQ (Redis), register all processors, graceful shutdown, Sentry init.
**`worker/queues/queue Definitions.ts`** — queue names: `notifications, scheduling, bookings, reports`. Exports typed `enqueue(job)`.
**`worker/processors/send-email.processor.ts`** — reads `Notification` row, calls `EmailService` (Mailgun), updates `sentAt`, retry 3x backoff (§11).
**`worker/processors/send-sms.processor.ts`** — reads `Notification` row, calls `SmsService` (MNotify), updates `sentAt`, retry 3x backoff (§11).
**`worker/processors/generate-slots.processor.ts`** — nightly + on-demand (§4.2). Idempotent upsert.
**`worker/processors/reconcile-slots.processor.ts`** — (§4.3). Never auto-cancels paid.
**`worker/processors/booking-hold-expiry.processor.ts`** — every 5 min (§7.3).
**`worker/processors/send-reminders.processor.ts`** — every 15 min with `reminder24hSent/reminder2hSent` flags (§11).
**`worker/processors/review-request.processor.ts`** — delayed 24h after COMPLETED (§9).
**`worker/processors/report-export.processor.ts`** — streams DB → CSV → Cloudflare R2, returns presigned URL (§12).
**`worker/cron.ts`** — `@nestjs/bullmq` cron schedules or node-cron wiring the above intervals. Railway cron triggers the worker — never executes long work in the main API process.

### 15.7 `src/types/` — shared contracts
**`types/api.ts`** — `ApiSuccess<T>, ApiError, Paginated<T>` envelope (§13.2). **DO NOT** duplicate Prisma types — import from `@prisma/client`. **`types/domain.ts`** — `BookingAction, CancelPolicy, SlotDTO, PriceBreakdown` used by both controllers and worker.

### 15.8 `test/` — proves the workflows
**`unit/`** — `pricing.service.test.ts` (multiplier math), `slots.service.test.ts` (window slicing), `transitions.test.ts` (illegal PENDING→COMPLETED rejected), `validators.test.ts`.
**`integration/`** — `booking-concurrency.test.ts` (10 parallel POST → 1×201 + 9×409, the DoD in §14), `payment-webhook.test.ts` (Stripe signature mock → CONFIRMED), `cancel-refund.test.ts`, `auth.test.ts`.
**`e2e/`** — NestJS `Test.createTestingModule()` full HTTP tests: `auth.e2e-spec.ts`, `booking.e2e-spec.ts`, `business.e2e-spec.ts`.
**`load/`** — k6 script `slot-race.js` for staging soak.

### 15.9 Root configs
**`.env.example`** — documents every var from ARCHITECTURE §9: `DATABASE_URL (pooled), DIRECT_URL, REDIS_URL, JWT_SECRET, STRIPE_*, MAILGUN_API_KEY, MAILGUN_DOMAIN, MNOTIFY_API_KEY, SENTRY_DSN`. No real secrets in repo.
**`nest-cli.json`** — NestJS CLI config: `compilerOptions.deleteOutDir: true`, `projects` for monorepo if needed.
**`tsconfig.json`** — TypeScript config: `strict: true`, `paths: { "@/*": ["src/*"] }`.
**`package.json`** — scripts: `dev, build, start:prod, db:migrate, db:seed, worker, test, test:e2e, test:integration, lint, typecheck`. Pins `node>=20`, `@nestjs/*, prisma, class-validator, stripe, ioredis, bullmq`.

**Build rule:** implement in §14 order. A feature is done only when its controller validates → authorizes → delegates to service → covered by a test in `test/`. If logic lives in `controller.ts` instead of `service.ts`, it's in the wrong place.

---

*Last Updated: September 2026 · Status: Backend workflow spec v1.2 — features by role + NestJS scaffold ready for implementation.*

