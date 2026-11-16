# Lumina Admin Console

Status: **Phase 2 shipped** (admin shell, dashboard, users, businesses). Remaining
admin routes are registered, guarded, navigable, and documented here, but
intentionally left as feature scaffolds.

Sources of truth, in priority order:

1. `backend/src/admin/*` and `backend/prisma/schema.prisma` — what the API actually does.
2. `backend/docs/admin/*.md` — design intent. It contains aspirational metrics and
   flows that the implementation does **not** ship yet. Where they disagree, the code wins.
3. `frontend/app/globals.css`, `components/ui/*` — the live design system.

Do not build a screen against a field or endpoint that is not in this document.

---

## 1. Scope and principles

- The console is for `UserRole.ADMIN` only. The backend enforces this on every
  `/admin/*` route with `JwtAuthGuard` + `RolesGuard` + `@Roles('ADMIN')`.
- The frontend guard is a UX gate, not a security boundary. A stale session can
  render the shell, but every data call will still be rejected by the API.
- Organise pages by role: `app/admin/*` now; `app/business/*` and
  `app/customer/*` will follow the same convention when their dashboards are built.
- Shared chrome lives in `components/dashboard/*`, not in the route folders.
- No new dependencies. Use the existing stack: Next.js 14 App Router, Tailwind v4,
  lucide-react, sonner, next-themes.
- Every metric and number comes from the API. No invented trends, refund rates, or
  charts until the backend returns them (see §10).

---

## 2. Backend audit

### 2.1 Routing, auth, and envelope

| Item | Value |
| --- | --- |
| Base URL | `http://localhost:7000/api/v1` (`NEXT_PUBLIC_API_URL`) |
| Controller | `@Controller('admin')` in `backend/src/admin/admin.controller.ts` |
| Guards | `JwtAuthGuard`, `RolesGuard`, `@Roles('ADMIN')` |
| Rate limit | 100 requests / minute / IP (global ThrottlerGuard) |
| JWT | 15-minute access token; role is re-read from the DB by `JwtStrategy` |
| Success envelope | `{ success: true, data: <service return value> }` |
| Error envelope | `{ success: false, error: { code, message, details?, requestId } }` |

The global `TransformInterceptor` wraps whatever a service returns in `data`. It
does **not** flatten. Several admin services already return `{ data, meta }`, which
produces a nested payload:

| Endpoint shape | Actual client payload after `request()` |
| --- | --- |
| Dashboard (service returns metrics object) | metrics object |
| List (service returns `{ data, meta }`) | `{ data: T[], meta }` |
| Detail / mutation (service returns `{ data }`) | `{ data: T }` |

`frontend/lib/api.ts` encodes this with `ApiList<T>` and `ApiItem<T>`. Keep it that
way; do not "fix" it in one place without fixing the services.

### 2.2 Endpoint inventory

All paths below are relative to `/api/v1` and require an ADMIN bearer token.

| Feature | Method | Path | Query / body |
| --- | --- | --- | --- |
| Dashboard | GET | `/admin/dashboard` | none |
| Users | GET | `/admin/users` | `role`, `q`, `page`, `limit`, `sortBy`, `sortOrder` |
| User detail | GET | `/admin/users/:id` | none |
| Activate user | PUT | `/admin/users/:id/activate` | none |
| Deactivate user | PUT | `/admin/users/:id/deactivate` | `{ reason? }` (max 500) |
| Businesses | GET | `/admin/businesses` | `status`, `isActive`, `q`, `page`, `limit` |
| Business detail | GET | `/admin/businesses/:id` | none |
| Verify business | PUT | `/admin/businesses/:id/verify` | `{ action: APPROVE \| REJECT, reason? }` |
| Deactivate business | PUT | `/admin/businesses/:id/deactivate` | `{ reason? }` |
| Bookings | GET | `/admin/bookings` | `date`, `status`, `businessId`, `customerId`, `from`, `to`, `page`, `limit` |
| Booking detail | GET | `/admin/bookings/:id` | none |
| Cancel booking | DELETE | `/admin/bookings/:id` | `{ reason }` (required, max 500) |
| Reviews | GET | `/admin/reviews` | `isHidden`, `businessId`, `minRating`, `maxRating`, `page`, `limit` |
| Hide review | PATCH | `/admin/reviews/:id/hide` | `{ reason }` (required) |
| Unhide review | PATCH | `/admin/reviews/:id/unhide` | none |
| Generate report | GET | `/admin/reports` | `from`, `to`, `type`, `businessId?` |
| Report status | GET | `/admin/reports/:jobId` | none |
| Audit log | GET | `/admin/audit` | `entity`, `action`, `actorId`, `from`, `to`, `page`, `limit` |

Pagination is page/limit (not cursor). `limit` is capped at 100. Lists are
newest-first unless stated.

### 2.3 Data models used

Existing models only. No new tables.

| Model | Fields the console cares about |
| --- | --- |
| `User` | `id`, `email`, `role`, `isActive`, `emailVerified`, `lastLoginAt`, `createdAt` |
| `Customer` | `firstName`, `lastName`, `phone`, vehicles, bookings |
| `Business` | identity, address, `isVerified`, `isActive`, `verificationStatus`, `rating`, `reviewCount`, `verifiedAt`, `verifiedBy`, `rejectionReason` |
| `Booking` | `status`, `date`, `timeSlot`, `totalPrice`, cancellation fields |
| `Payment` | `status`, `amount`, `currency`, `method` |
| `Review` | `rating`, `comment`, `isHidden`, `hiddenReason`, `response` |
| `AuditLog` | `actorId`, `action`, `entityType`, `entityId`, `metadata`, `createdAt` |
| `ReportJob` | `type`, `status`, `fileUrl`, `rowcount`, `error`, `completedAt` |

Enums already mirrored in `frontend/lib/api.ts`: `UserRole`, `BookingStatus`,
`PaymentStatus`, `VerificationStatus`, `ReportStatus`.

### 2.4 Dashboard payload: actual vs design doc

`GET /admin/dashboard` currently returns exactly:

```json
{
  "bookingsToday": 0,
  "revenueMTD": 0,
  "activeBusinesses": 0,
  "pendingVerifications": 0,
  "totalUsers": 0
}
```

Cached in Redis for 60 seconds (`CacheService.dashboardKey()`).

`backend/docs/admin/01-platform-dashboard.md` also promises `revenueMTDCurrency`,
`refundRate`, and a 7-day `bookingsTrend`. **None of those exist in the service
yet.** The dashboard therefore shows five metric cards and no chart. If trends are
wanted later, add them to `AdminService.getDashboardMetrics()` first.

Revenue is a `Payment.amount` sum. `Payment.currency` defaults to `USD` in the
schema, while `FRONTEND.md` §12.1 targets GHS. Until the backend normalises
currency, the dashboard labels the figure `USD` and the doc flags the mismatch.

---

## 3. Frontend information architecture

### 3.1 Role directories

```
frontend/app/
  admin/
    layout.tsx
    loading.tsx
    error.tsx
    page.tsx                 ← dashboard (implemented)
    users/page.tsx
    users/[id]/page.tsx
    businesses/page.tsx
    businesses/[id]/page.tsx
    bookings/page.tsx
    bookings/[id]/page.tsx
    reviews/page.tsx
    reports/page.tsx
    audit/page.tsx
  business/                  ← reserved, same pattern
  customer/                  ← reserved, same pattern
```

Shared admin chrome and primitives:

```
frontend/components/dashboard/
  AdminShell.tsx             client guard + sidebar/topbar layout
  admin-nav.ts               nav sections + toolkit metadata
  MetricCard.tsx             glass metric tile
  AdminFeaturePage.tsx       scaffold template for planned routes
  UsersManager.tsx           searchable account directory
  UserProfile.tsx            account profile and activity
  UserStatusDialog.tsx       activate/suspend confirmation
  UserBadges.tsx             shared role, status, avatar treatments
  user-utils.ts              formatting and display helpers
```

`frontend/lib/api.ts` holds every admin type and request function. Pages must not
call `fetch` directly.

### 3.2 Route tree

| Route | Purpose | Status | Backend |
| --- | --- | --- | --- |
| `/admin` | Welcome dashboard, 5 live metrics, queue summary, quick actions | Implemented | `GET /admin/dashboard` |
| `/admin/users` | Search, filter, paginate accounts | Implemented | `GET /admin/users` |
| `/admin/users/[id]` | Account profile + activate/deactivate | Implemented | `GET /admin/users/:id` |
| `/admin/businesses` | Verification and partner list | Implemented | `GET /admin/businesses` |
| `/admin/businesses/[id]` | Partner profile + verify/deactivate | Implemented | `GET /admin/businesses/:id` |
| `/admin/bookings` | Platform booking ledger | Scaffold | `GET /admin/bookings` |
| `/admin/bookings/[id]` | Booking timeline + cancel | Scaffold | `GET /admin/bookings/:id` |
| `/admin/reviews` | Moderation queue | Scaffold | `GET /admin/reviews` |
| `/admin/reports` | CSV generation | Scaffold | `GET /admin/reports` |
| `/admin/audit` | Read-only audit ledger | Scaffold | `GET /admin/audit` |

### 3.3 Navigation model

Grouped, config-driven from `admin-nav.ts`:

- Overview — Dashboard
- Platform — Users, Businesses, Bookings
- Trust — Reviews
- Insights — Reports, Audit trail

Desktop: sticky glass sidebar with section labels, active gradient accent, and a
signed-in user chip. Mobile: horizontal, scrollable pill row under the top bar.
The dashboard "Admin toolkit" reuses the same metadata (excluding Dashboard).

---

## 4. Session and guard flow

1. `LoginForm` posts to `/auth/login`, then `saveSession()` stores
   `{ accessToken, user, customer, business }` in local or session storage under
   `lumina.session`.
2. Redirect is role-aware: `ADMIN → /admin`; everyone else stays on `/`.
3. `AdminShell` reads the session on mount:
   - no session → `router.replace("/login")`
   - role !== ADMIN → toast + `router.replace("/")`
   - otherwise render chrome and children
4. `AdminShell` shows a full-screen “Verifying admin session” state until the
   check completes, so scaffold content never flashes for the wrong role.
5. A 401/403 from a data call clears the session and returns the admin to login.
6. Sign out clears both storages and redirects to `/login`.

There is no Next.js middleware because the session lives in browser storage. The
backend remains the enforcement point. If server-side gating is needed later,
move the access token to an httpOnly cookie first.

---

## 5. Shared building blocks

| Block | Responsibility |
| --- | --- |
| `AdminShell` | Auth gate, top bar, sidebar, mobile nav, footer, sign out |
| `MetricCard` | Label, value, hint, icon tone, optional link, loading skeleton |
| `AdminFeaturePage` | Scaffold header, capability checklist, API contract, build notes |
| `buttonClass` | Existing `gradient`, `gradientOutline`, `outline`, `ghost` variants |
| `glassCardClass` | Glass surface, border, inner highlight, dark-mode tuning |
| `BrandMark`, `ThemeToggle` | Existing brand and theme controls |
| `ApiList` / `ApiItem` | Match the backend’s nested envelope |
| sonner `toast` | All success/error feedback; styled by `.lumina-toast` |

---

## 6. Feature scaffolds

### 6.1 Dashboard — implemented

- Greeting uses `customer.firstName`, falling back to the email local-part.
- Five live metrics: bookings today, revenue MTD, active businesses, pending
  verifications, active users.
- Pending verifications drive the "Needs attention" panel; zero shows a cleared
  state.
- Manual refresh; no polling. Server cache is 60 seconds.
- Loading skeletons, a retryable error banner, and 401/403 recovery.
- Links: bookings, businesses, pending queue, users, reports.

Acceptance: `/admin` loads for an ADMIN, redirects non-admins, survives a stopped
backend with a readable error + retry, and is usable at 360 px and 1440 px.

### 6.2 User management — implemented

- List (`/admin/users`): debounced name/email/business search, role chips,
  server-backed sorting, responsive table/cards, pagination, live status badges,
  and an "Open profile" link.
- Detail (`/admin/users/:id`): identity, role and verification state, customer
  stats with vehicles and recent bookings, business stats with services, and
  activity timestamps.
- Deactivate: confirmation dialog with optional reason; revokes sessions and
  cancels future bookings. Reactivate: single PUT confirmation.
- Account status cannot be changed from the signed-in admin's own row or
  profile. There is no edit-role or delete-account UI.

### 6.3 Business management — implemented

- List (`/admin/businesses`): opens on `status=PENDING` when linked from the
  dashboard; debounced name/city/owner-email search, verification chips, listing
  state filter, responsive table/cards, pagination, rating, owner email, and a
  deactivate confirmation for live partners.
- Detail (`/admin/businesses/:id`): identity and contact, location with an
  OpenStreetMap link, owner account link, service catalogue, booking/review
  counts, lifetime revenue, and verification/moderation state.
- Verify: APPROVE/REJECT; reason required for REJECT in the UI even though the DTO
  makes it optional. Approval marks the business verified and emails the partner.
- Deactivate: reason optional, but always send one for the audit trail. Existing
  services, bookings, reviews, and records are preserved.
- There is no reactivation control; the backend has no endpoint for it yet.
- Lists and details use short-lived in-memory caching plus hover/focus prefetching;
  mutations invalidate the cache before revalidation.

### 6.4 Booking management

- List: date picker, status filter, business/customer lookup, created-at range,
  pagination. Row shows customer, partner, service, vehicle, payment, status.
- Detail: lifecycle timeline, parties, service/vehicle, payment, attached review.
- Cancel: reason required; destructive; works for PENDING through COMPLETED.
- Admin cancellation marks a COMPLETED payment `REFUNDED` but does not call the
  Stripe refund API. Treat the label as an internal status update and flag the
  gap until payment reconciliation is wired.

### 6.5 Review moderation

- List: hidden toggle (all / visible / hidden), business filter, rating range,
  pagination. Show customer email, partner, rating, comment, hidden reason.
- Hide: reason required. Unhide: no body.
- Both operations recompute the partner's rating and review count. Expect the
  business list to change after moderation.
- There is no delete, edit, or partner-response action in the admin API.

### 6.6 Reports

- Form: type (`bookings`, `revenue`, `businesses`, `users`), `from`, `to`,
  optional `businessId`. Enforce 90 days max and end >= start client-side too.
- Generation is synchronous. Show a pending state until the response returns,
  then offer `downloadUrl` and the row count.
- Download links expire around one hour.
- There is no report history list. Persist recent job ids in component state only;
  refresh the status endpoint if a download is reopened.

### 6.7 Audit trail

- Filters: entity type, action, actor id, date range; pagination.
- Read-only. Render action, entity, actor, timestamp, and collapsible metadata.
- Known action strings: `USER_DEACTIVATED`, `BUSINESS_APPROVED`,
  `BUSINESS_REJECTED`, `BUSINESS_DEACTIVATED`, `BOOKING_CANCELLED_ADMIN`,
  `REVIEW_HIDDEN`, `REVIEW_UNHIDDEN`.
- No export endpoint.

---

## 7. Design system usage

- Palette: Sea (`--primary`, `--color-sea-*`) and Sky (`--accent`,
  `--color-sky-*`) on paper/ink. Dark theme is the default.
- Surfaces: `glassCardClass()` for every panel; `stage-surface` for large stages.
- Actions: `gradient` for primary, `gradientOutline` for secondary. Radius follows
  the "Find a wash" reference (`rounded-[1.05rem]` inside the variant). Do not
  override with `rounded-full` or `rounded-2xl` on auth-style CTAs.
- Type: Fraunces (`font-display`) for headings and big numbers; IBM Plex Sans for
  body; IBM Plex Mono for eyebrows, labels, endpoints, and metadata.
- Colour usage: sea = primary/active, sky = secondary/informational, green =
  cleared/success, amber = attention, red = destructive.
- Motion: 200 ms hover transitions; no decorative animation beyond the existing
  floating blobs. Respect reduced motion inherited from `globals.css`.
- Feedback: sonner toasts only, with the existing gradient styling. Errors must
  include the backend `message`.
- Accessibility: one `h1` per page, labelled sections, visible focus rings,
  `aria-current` on nav, and text contrast in both themes.

---

## 8. Build order

| Phase | Work | Status |
| --- | --- | --- |
| 1 | Shell, guard, dashboard, nav, error/loading routes | Done |
| 2 | Users list/detail + businesses list/detail (verification queue first) | Done |
| 3 | Bookings list/detail + cancellations + reviews moderation | Scaffolded |
| 4 | Reports form/status/download + audit ledger | Scaffolded |
| 5 | Empty/loading/error polish, mobile tables, a11y pass, manual E2E | Pending |

Build one vertical slice at a time: API function → list → detail → mutation →
toast → loading/empty/error → responsive check.

---

## 9. Verification checklist

- `npm run typecheck` in `frontend/` passes.
- `npm run build` in `frontend/` passes.
- Signed-out `/admin` redirects to `/login`.
- Customer session on `/admin` redirects to `/` with a toast.
- Admin login lands on `/admin`; the shell shows the admin email.
- Dashboard renders five metrics, loading skeletons, error + retry, and the
  pending-queue CTA.
- `401` from the API clears the session; `403` is explained, not silently ignored.
- Light and dark themes, 360 px / 768 px / 1440 px layouts.
- No console errors, no hydration warnings.

---

## 10. Known gaps and open questions

1. **Dashboard extras are not implemented.** `refundRate`, `revenueMTDCurrency`,
   and `bookingsTrend` appear in `backend/docs/admin/01` but not in the service.
2. **Currency mismatch.** `Payment.currency` defaults to `USD`; `FRONTEND.md`
   targets GHS. The dashboard says USD until the backend is normalised.
3. **No role management.** Admins cannot promote/demote users or change a role from
   the console; only activate/deactivate exists.
4. **No user or business deletion.** Keep destructive copy precise; "deactivate"
   is reversible for users, not for businesses (no reactivation endpoint).
5. **Refund is a status flip.** `AdminBookingService.cancelBooking` updates the
   payment to `REFUNDED` without calling Stripe. Reconciliation is a backend task.
6. **Audit actor bug.** `AdminService.deactivateUser` writes `actorId: id` (the
   target user) instead of the admin's id. Fix before relying on actor filters for
   user deactivations.
7. **Reports are synchronous and unlisted.** No queue, no history, no re-download
   after the presigned URL expires.
8. **No admin profile/notification endpoints.** Do not scaffold settings pages yet.
9. **Ghana-specific localisation** (GHS, addresses) is a product decision pending
   backend consistency.

---

## 11. File inventory

Implemented in this phase:

- `app/admin/layout.tsx`, `loading.tsx`, `error.tsx`, `page.tsx`
- `app/admin/users/page.tsx`, `users/[id]/page.tsx`
- `app/admin/businesses/page.tsx`, `businesses/[id]/page.tsx`
- `app/admin/bookings/page.tsx`, `bookings/[id]/page.tsx`
- `app/admin/reviews/page.tsx`
- `app/admin/reports/page.tsx`
- `app/admin/audit/page.tsx`
- `components/dashboard/AdminShell.tsx`
- `components/dashboard/AdminFeaturePage.tsx`
- `components/dashboard/MetricCard.tsx`
- `components/dashboard/admin-nav.ts`
- `lib/api.ts` (admin types and client functions)
- `components/auth/AuthCard.tsx` (role-aware redirect)

Next phase should replace scaffold pages with real tables/forms, one feature at a
time, without changing the shell or the API layer contract.
