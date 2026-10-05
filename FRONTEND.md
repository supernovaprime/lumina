# FRONTEND.md — Lumina (CarWash) Frontend Scaffold

> **Status:** SCAFFOLD / SPEC — no implementation yet.
> **Stack (per `ARCHITECTURE.md`):** Next.js 14+ (App Router) · Tailwind CSS v4 · shadcn/ui ·
> TanStack Query · React Hook Form + Zod · Leaflet + OpenStreetMap · Nominatim ·
> NextAuth.js v5 (credentials bridge to NestJS JWT) · Vercel.
> **Backend:** NestJS REST at `http://localhost:7000/api/v1` (see `BACKEND.md`).
> Envelope: success → `{ success: true, data, meta? }`; error → `{ success: false, error: { code, message, details? } }`.

---

## 1. Design System — "Deep Water & Gold"

Brand anchors (user-supplied, **do not change these hex values**):

```css
@import "tailwindcss";

@theme {
  --color-navy-950: #001219;
  --color-navy-800: #005f73;
  --color-teal-600: #0a9396;
  --color-gold-500: #ee9b00;
  --color-gold-200: #e9d8a6;
}
```

### 1.1 Full ramps (derived — anchors marked *)

**Navy** (deep petrol; surfaces, text, dark-mode base):

| 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800* | 900 | 950* |
|---|---|---|---|---|---|---|---|---|---|---|
| `#f0f7f8` | `#dcebee` | `#b9d7dd` | `#8abcc6` | `#559cae` | `#2b7f93` | `#0e6b7f` | `#086274` | `#005f73` | `#003844` | `#001219` |

**Teal** (primary actions, links, focus rings):

| 50 | 100 | 200 | 300 | 400 | 500 | 600* | 700 | 800 | 900 | 950 |
|---|---|---|---|---|---|---|---|---|---|---|
| `#effafa` | `#d7f1f2` | `#b0e3e5` | `#79cfd3` | `#3db4ba` | `#1b9aa2` | `#0a9396` | `#0b7b7f` | `#0e6266` | `#0f4f53` | `#043034` |

**Gold** (accent, CTAs, ratings, highlights):

| 50 | 100 | 200* | 300 | 400 | 500* | 600 | 700 | 800 | 900 | 950 |
|---|---|---|---|---|---|---|---|---|---|---|
| `#fdf8ec` | `#faf0d7` | `#e9d8a6` | `#e3c878` | `#e5ad45` | `#ee9b00` | `#c67f00` | `#a16102` | `#854f0a` | `#713f0c` | `#421f02` |

### 1.2 Semantic tokens — light & dark

Light = warm paper background, navy ink text. Dark = navy-950 abyss background, warm-white text.
Primary action = teal; high-emphasis CTA / rating = gold. Destructive = standard red (`--color-red-600` Tailwind default).

| Token | Light | Dark |
|---|---|---|
| `background` | `#ffffff` | `#001219` (navy-950) |
| `surface` (cards, muted bg) | `#f0f7f8` (navy-50) | `#003844` (navy-900) |
| `surface-2` (hover, inset) | `#dcebee` (navy-100) | `#005f73` (navy-800) |
| `foreground` (body text) | `#001219` (navy-950) | `#f4f1ea` (warm white) |
| `muted` (secondary text) | `#0e6b7f` (navy-600) | `#8abcc6` (navy-300) |
| `border` | `#b9d7dd` (navy-200) | `#0e6266` (teal-800) |
| `primary` (buttons, links) | `#0a9396` (teal-600) | `#3db4ba` (teal-400) |
| `primary-fg` (on-primary text) | `#ffffff` | `#001219` |
| `accent` (CTA, stars, badges) | `#ee9b00` (gold-500) | `#ee9b00` (gold-500) |
| `accent-soft` (accent bg tint) | `#e9d8a6` (gold-200) | `#713f0c` (gold-900) |
| `ring` (focus) | `#0a9396` (teal-600) | `#3db4ba` (teal-400) |

### 1.3 `globals.css` scaffold (Tailwind v4 + `next-themes`, class-based dark)

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@theme {
  /* — Brand ramps (§1.1) — */
  --color-navy-50: #f0f7f8;
  --color-navy-100: #dcebee;
  --color-navy-200: #b9d7dd;
  --color-navy-300: #8abcc6;
  --color-navy-400: #559cae;
  --color-navy-500: #2b7f93;
  --color-navy-600: #0e6b7f;
  --color-navy-700: #086274;
  --color-navy-800: #005f73;
  --color-navy-900: #003844;
  --color-navy-950: #001219;

  --color-teal-50: #effafa;
  --color-teal-100: #d7f1f2;
  --color-teal-200: #b0e3e5;
  --color-teal-300: #79cfd3;
  --color-teal-400: #3db4ba;
  --color-teal-500: #1b9aa2;
  --color-teal-600: #0a9396;
  --color-teal-700: #0b7b7f;
  --color-teal-800: #0e6266;
  --color-teal-900: #0f4f53;
  --color-teal-950: #043034;

  --color-gold-50: #fdf8ec;
  --color-gold-100: #faf0d7;
  --color-gold-200: #e9d8a6;
  --color-gold-300: #e3c878;
  --color-gold-400: #e5ad45;
  --color-gold-500: #ee9b00;
  --color-gold-600: #c67f00;
  --color-gold-700: #a16102;
  --color-gold-800: #854f0a;
  --color-gold-900: #713f0c;
  --color-gold-950: #421f02;

  --font-display: "Montserrat", ui-sans-serif, system-ui, sans-serif;
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
  --radius-lg: 0.75rem;
}

:root {
  --background: #ffffff;
  --foreground: #001219;
  --surface: #f0f7f8;
  --surface-2: #dcebee;
  --muted: #0e6b7f;
  --border: #b9d7dd;
  --primary: #0a9396;
  --primary-fg: #ffffff;
  --accent: #ee9b00;
  --accent-soft: #e9d8a6;
  --ring: #0a9396;
}

.dark {
  --background: #001219;
  --foreground: #f4f1ea;
  --surface: #003844;
  --surface-2: #005f73;
  --muted: #8abcc6;
  --border: #0e6266;
  --primary: #3db4ba;
  --primary-fg: #001219;
  --accent: #ee9b00;
  --accent-soft: #713f0c;
  --ring: #3db4ba;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-muted: var(--muted);
  --color-border: var(--border);
  --color-primary: var(--primary);
  --color-primary-fg: var(--primary-fg);
  --color-accent: var(--accent);
  --color-accent-soft: var(--accent-soft);
  --color-ring: var(--ring);
}
```

Rules:
- Theme toggle via `next-themes` (`ThemeProvider attribute="class" defaultTheme="system"`).
  Persist key `lumina-theme`. Respect `prefers-color-scheme` on first visit.
- All components use semantic utilities (`bg-background text-foreground border-border bg-surface …`) —
  **never hardcode** `bg-white` / `bg-black` / raw hex in components.
- Focus rings: `focus-visible:ring-2 ring-ring` on every interactive element.
- Dark-mode QA checklist per page: cards, borders, muted text, map tiles (Leaflet dark tiles, §7),
  Stripe Elements appearance (§8), images with transparency.

### 1.5 Brand assets (locked decisions)
Source files live in `frontend/public/assets/` — **do not move them**:

| File | Role | Notes |
|---|---|---|
| `Logo (2).svg` | **Canonical icon: favicon + app icons + metadata images** | Transparent background master (PNG embedded in SVG wrapper). Used for browser tab, bookmarks, PWA/manifest, social share, navbar mark. |
| `logo.svg` | **Loading animation + in-app brand component** | True vector, palette-native, exposes `#lumina-droplet` and `#lumina-sparkle` groups for CSS animation. Inlined (never `<img>`) wherever animated. |
| `logo.jpg` | Full lockup (emblem + wordmark + tagline) for hero / footer / OG image base | Raster; never used as icon. |

Favicon wiring (Phase 1 implements):
- Copy `Logo (2).svg` → `app/icon.svg` (Next.js App Router auto-serves it as favicon).
- Export PNG fallbacks with a zero-cost script (`scripts/export-icons.mjs` using `sharp`,
  already a Next.js dependency): `icon-32.png`, `apple-touch-icon-180.png`,
  `manifest` 192/512. SVG favicons cover modern browsers; PNGs cover Safari/older clients.
- `app/manifest.ts` + `metadata.icons` + `themeColor` per §1.2
  (`#ffffff` light / `#001219` dark).

Loader wiring (Phase 1 implements):
- `components/brand/LogoLoader.tsx` — inlines `logo.svg` markup as a React component
  (props: `size`, `animate=true`), CSS keyframes: droplet gentle bob + shimmer
  (`#lumina-droplet`), sparkle twinkle (`#lumina-sparkle`), brand text fade.
- `app/loading.tsx` — route-level suspense fallback rendering `<LogoLoader />`.
- Fullscreen splash variant for auth-gated transitions (role portals).
### 1.4 Typography & shape
- **Primary / display — Montserrat** (`font-display`): headings, hero, brand wordmark, nav.
  Weights 600–800; tight tracking on large sizes (`tracking-tight`).
- **Secondary / data — JetBrains Mono** (`font-mono`): prices, slot times, booking refs,
  countdowns, API-ish tokens. Always `tabular-nums` where aligned comparison matters.
- **Tertiary / body — Inter** (`font-sans`, default): body copy, UI labels, form inputs, toasts.
  Weights 400–600; relaxed leading (`leading-relaxed`) for paragraphs.
- Load via `next/font/google` (self-hosted, zero-cost, no CLS):
  ```tsx
  import { Montserrat, Inter, JetBrains_Mono } from "next/font/google";
  const display = Montserrat({ subsets: ["latin"], weight: ["600","700","800"], variable: "--font-display" });
  const sans = Inter({ subsets: ["latin"], weight: ["400","500","600"], variable: "--font-sans" });
  const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400","500","600"], variable: "--font-mono" });
  // <html className={`${display.variable} ${sans.variable} ${mono.variable}`}>
  ```
- Radius: cards `rounded-xl`, buttons/inputs `rounded-lg`, pills `rounded-full`.
- shadcn/ui mapping: `primary` → teal (§1.2), `accent` → gold-soft bg + gold-700/300 text,
  `destructive` → default red, `muted` → navy tints. Install shadcn components with the
  `new-york` style and re-point its CSS vars at §1.2 tokens.

---

## 2. Project Structure (`frontend/`)

```
frontend/
├── .env                          # NEXT_PUBLIC_* (empty template committed; secrets in Vercel)
├── next.config.mjs
├── tailwind.config.ts            # minimal — theme lives in globals.css (v4)
├── app/
│   ├── globals.css               # §1.3
│   ├── layout.tsx                # ThemeProvider, QueryProvider, Toaster, fonts, metadata/icons
│   ├── icon.svg                  # ← copy of public/assets/Logo (2).svg (§1.5)
│   ├── manifest.ts               # PWA manifest (§1.5)
│   ├── loading.tsx               # suspense fallback → <LogoLoader /> (§1.5)
│   ├── page.tsx                  # public landing (hero, search entry, featured)
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (customer)/               # CUSTOMER role (NextAuth middleware gate)
│   │   ├── search/page.tsx       # query + Leaflet map + filters (openNow, rating, price)
│   │   ├── businesses/[id]/page.tsx  # detail, services, slots, reviews, favorite toggle
│   │   ├── booking/[businessId]/page.tsx  # slot picker → vehicle → pay (Stripe)
│   │   ├── bookings/page.tsx     # upcoming/past, cancel, review (24h cooldown notice)
│   │   ├── vehicles/page.tsx
│   │   ├── favorites/page.tsx    # nextAvailableSlot chips
│   │   ├── notifications/page.tsx
│   │   ├── payments/page.tsx     # history + receipts (§12: GHS currency)
│   │   ├── reviews/page.tsx      # my reviews (§12)
│   │   ├── help/page.tsx         # FAQ + contact (§12)
│   │   ├── settings/page.tsx     # theme, notifications prefs, GDPR links (§12)
│   │   └── profile/page.tsx      # incl. GDPR export/delete requests
│   ├── (business)/               # BUSINESS role gate
│   │   ├── dashboard/page.tsx    # analytics (bookings, revenue, rating)
│   │   ├── bookings/page.tsx     # manage statuses
│   │   ├── services/page.tsx     # CRUD + price modifiers
│   │   ├── availability/page.tsx # templates → slot generation preview
│   │   ├── reviews/page.tsx      # list + respond/edit response
│   │   └── profile/page.tsx
│   ├── (admin)/                  # ADMIN role gate
│   │   ├── dashboard/page.tsx
│   │   ├── users/page.tsx
│   │   ├── businesses/page.tsx   # verify/approve
│   │   ├── bookings/page.tsx
│   │   ├── payments/page.tsx     # refunds (full + partial amountCents)
│   │   └── reports/page.tsx      # generate CSV, download via R2 URL
│   └── api/auth/[...nextauth]/route.ts  # NextAuth v5 handlers
├── components/
│   ├── ui/                       # shadcn/ui (button, card, dialog, input, …)
│   ├── brand/                    # LogoLoader.tsx (inlined logo.svg + keyframes) (§1.5)
│   ├── layout/                   # Navbar (theme toggle), Footer, RoleNav, Guards
│   │                             # + AppShell/Sidebar/Topbar for authed portals (§12)
│   ├── landing/                  # Hero, ServicesGrid, HowItWorks, Testimonials, AppBand (§12)
│   ├── feedback/                 # Toast.tsx (Toaster + toast.info/success/warning/danger) (§12.7)
│   ├── dashboard/                # GreetingHero, StatCard, QuickBookPanel, BookingCard,
│   │                             # VehicleRow, WeatherCard, QuickActions, OfferCard,
│   │                             # ActivityFeed (§12)
│   ├── booking/                  # SlotPicker, BookingSummary, CancelDialog
│   ├── search/                   # SearchBar, FilterPanel, BusinessCard, MapView
│   ├── payment/                  # StripeCheckout (Elements), RefundDialog
│   ├── review/                   # Stars, ReviewForm, ReviewList, RespondBox
│   └── theme/                    # ThemeToggle, ThemeProvider
├── lib/
│   ├── api.ts                    # fetch wrapper: baseURL, Bearer inject, refresh, envelope unwrap
│   ├── auth.ts                   # NextAuth config (credentials → NestJS /auth/*)
│   ├── queries/                  # TanStack Query hooks per domain (keys factory)
│   ├── schemas.ts                # Zod schemas mirroring backend DTOs
│   ├── stripe.ts                 # @stripe/stripe-js loader (publishable key only)
│   ├── geo.ts                    # Nominatim geocode helpers (custom UA header)
│   ├── weather.ts                # Open-Meteo (keyless) current weather by lat/lng (§12)
│   ├── currency.ts               # GHS formatting (§12 — NOT USD)
│   └── utils.ts                  # cn(), dates, greeting-by-time (§12)
└── hooks/                        # useDebounce (search), useGeolocation, useThemeAck …
```

Conventions: kebab-case files, `PascalCase` components; server components by default,
`"use client"` only for interactive islands (forms, map, checkout, pickers).

---

## 3. Route Map → Backend Endpoints

Base: `NEXT_PUBLIC_API_URL=http://localhost:7000/api/v1` (prod: Railway URL).

| Page | Method + Path (prefix `/api/v1`) | Notes |
|---|---|---|
| register / login | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me` | NextAuth credentials provider stores access(15m)+refresh(7d); silent refresh in `lib/api.ts` |
| search | `GET /search/businesses?query&lat&lng&radius&service&minRating&sort&openNow` | debounce 300ms; `nextAvailableSlot` chip on cards |
| business detail | `GET /businesses/:id`, `GET /businesses/:id/services`, `GET /businesses/:id/reviews`, slots via availability | favorite toggle → favorites endpoints |
| booking flow | `POST /bookings` → `POST /payments` (returns `clientSecret`) → Stripe confirm → `GET /bookings/:id` | hold-expiry = 15 min: show countdown; idempotency key per attempt |
| my bookings | `GET /customers/:id/bookings`, `DELETE /bookings/:id` (cancel) | review button enabled only after 24h cooldown |
| vehicles / favorites / notifications | vehicles CRUD; favorites CRUD; `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` | poll notifications every 60s when tab visible |
| customer dashboard (AppShell) | upcoming bookings + vehicles + favorites + unread count (parallel queries) | greeting, stat cards, quick-book, right rail (§12) |
| payments history | `GET /payments/history` | GHS amounts, status chips, gateway refs (§12) |
| my reviews / help / settings | `GET /reviews?customerId=me`; static FAQ; prefs | edit-window + cooldown notices (§12) |
| reviews | `POST /reviews`, business `PATCH /reviews/:id/respond` (edit allowed), admin `DELETE /reviews/:id` | star input, 24h-cooldown explainer |
| business dashboard | analytics/bookings/services/availability/reviews endpoints | charts: lightweight (no heavy dep; SVG or tiny lib) |
| admin | 14 admin endpoints (users, verify business, bookings, reports → R2 CSV URL) | refunds support partial `amountCents` (number) |
| GDPR (profile) | export request → download `fileUrl`; delete/anonymize request | status polling on `GdprRequest` |

---

## 4. API Client & Auth (spec)

- `lib/api.ts`: single `apiFetch(path, { method, body, auth })` — injects Bearer access token,
  unwraps `{ success, data }`, throws typed `ApiError { code, message, details }` from error envelope;
  on 401 → single-flight `POST /auth/refresh` → retry once → else sign out to `/login`.
- NextAuth v5: `Credentials` provider calls NestJS login; JWT session carries
  `{ accessToken, refreshToken, role, userId }`; middleware gates `(customer|business|admin)` groups by `role`.
- TanStack Query: `QueryClient` with `staleTime 30s`, retry 1 (no retry on 4xx); key factory
  `q.business(id)`, `q.slots(businessId,date)`, `q.bookings(filters)` …; optimistic updates for
  favorite toggle + notification read; invalidate search cache on booking create.

## 5. Forms & Validation (spec)
- React Hook Form + `zodResolver`; schemas in `lib/schemas.ts` mirroring backend DTOs
  (register/login, vehicle, booking create, review 1–5 + comment, service CRUD, refund amount).
- Inline field errors from `details[]` (map `field → message`); toast on `error.message`.

## 6. Theming Implementation (spec)
- `next-themes` + `@custom-variant dark` (§1.3). Toggle in Navbar (Sun/Moon, `aria-pressed`).
- No flash: `suppressHydrationWarning` on `<html>`, theme script before paint (next-themes handles).
- Story/test matrix: every page screenshots light + dark before milestone sign-off.

## 7. Maps (spec)
- Leaflet + OSM tiles (no key). Light: standard OSM; dark: `CartoDB.dark_matter` tiles.
- `MapView` (client island): business pins → click → card popover → detail link.
- Geolocation (`hooks/useGeolocation`) feeds `lat/lng/radius`; fallback = Nominatim text search (`lib/geo.ts`, UA `Lumina <contact>`).

## 8. Payments (spec)
- Stripe Elements (`@stripe/stripe-js`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` only in frontend).
- Flow: create booking → `POST /payments` → `clientSecret` → `confirmCardPayment` →
  success → bookings page; failure → backend `payment-failed` notification surfaces.
- Elements `appearance`: light → navy/teal; dark → navy-900 surfaces, warm-white text.
- Admin refunds: dialog with full/partial toggle (`amountCents` number input when partial).

## 9. Env & Scripts (spec)

```env
# frontend/.env (public template)
NEXT_PUBLIC_API_URL=http://localhost:7000/api/v1
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=[generate: openssl rand -base64 32]
```

```json
{ "scripts": {
  "dev": "next dev", "build": "next build", "start": "next start",
  "lint": "next lint", "typecheck": "tsc --noEmit", "test": "vitest run"
} }
```

## 10. Build Phases (scaffold order)

1. **Shell** — init app, `globals.css` (§1.3), layout, Navbar/Footer, ThemeToggle, landing.
   Brand wiring first: `app/icon.svg` ← `Logo (2).svg`, PNG fallbacks via `sharp` script,
   `manifest.ts`, `LogoLoader` + `app/loading.tsx` (§1.5).
2. **Auth** — NextAuth bridge, middleware gates, login/register/forgot/reset pages.
3. **Search & discovery** — search page + map + business detail + favorites.
4. **Booking & payments** — slot picker → vehicle → Stripe checkout → confirmation.
5. **Customer hub** — bookings, vehicles, notifications, reviews, GDPR.
6. **Business portal** — dashboard, bookings, services, availability, reviews, profile.
7. **Admin portal** — dashboard, users, verify, bookings, payments/refunds, reports.
8. **Hardening** — light/dark QA matrix, a11y (labels, focus, contrast ≥ 4.5), Lighthouse targets
   (FCP < 1.5s, LCP < 2.5s per ARCHITECTURE.md §10), error boundaries + Sentry.

## 11. Acceptance Rules (scaffold contracts)
- Zero-cost only (no paid deps/services); free-tier-safe (debounced search, 60s notif polling).
- Every page works in **both** themes; no hardcoded colors outside `globals.css`.
- All server data via TanStack Query hooks in `lib/queries/` (no ad-hoc fetch in components).
- Every form validated with Zod; backend `details[]` mapped to fields.
- Role gates enforced in middleware **and** hidden nav (defense in depth; backend is source of truth).

## 12. Mockup Diagnostics (`screen.jpg` = landing, `dashboard_screen.jpg` = customer dashboard)

Studied both mockups; deltas below are now part of the scaffold.

### 12.1 Currency is GHS — not USD (breaking catch)
Mockups price everything in **GH₵ (Ghana cedi)**: `From GHS 50`, `GH₵ 90.00`.
`ARCHITECTURE.md`/backend default to USD. Scaffold rule:
- `lib/currency.ts`: single `formatGHS(amount)` (`en-GH`, `GHS`, 2dp → `GH₵ 90.00`).
  No other currency formatter may exist.
- Every payment create request sends explicit `currency: "GHS"`.
- **Backend follow-up:** change `Payment.currency` default `USD → GHS` (or confirm per-request
  currency already wins). Flagged, not assumed.

### 12.2 Authenticated AppShell (from dashboard mockup)
Authed portals share one shell; only nav config differs per role:
- `layout/AppShell.tsx`: dark-navy `Sidebar` (logo, role nav, promo card, user chip) +
  `Topbar` (global search → `/search?q=`, bell with unread badge, ThemeToggle, avatar menu) +
  content well (`bg-background`) + optional right rail slot.
- Sidebar nav is config-driven: `nav/customer.ts`, `nav/business.ts`, `nav/admin.ts`
  (label, href, icon, badge query key). Active item = gold pill (mockup).
- Unread badge: derive from notifications query (`isRead=false` count, client-side).
- Greeting util: `Good Morning|Afternoon|Evening, {firstName}!` by local hour.

### 12.3 Landing page sections (from `screen.jpg`)
`app/page.tsx` composes `components/landing/*`:
`Navbar` (links: Home, Services, Find a Car Wash, About, Contact + Log In outline + Sign Up gold) →
`Hero` (eyebrow badge, Montserrat H1 with gold second line, dual CTA, trust row, car visual,
script accent) → `ServicesGrid` (5 category cards: Basic/Premium/Full Detail/Wax & Polish/Interior,
image + icon chip + `From {GHS}` + gold arrow → `/search?service=`) → `HowItWorks` (dark band,
4 steps) → `Testimonials` (carousel, static content) → `AppBand` (store badges = "coming soon",
disabled) → `Footer` (Quick Links, Support incl. FAQs/Terms/Privacy routes, socials, newsletter
input → toast "subscribed" stub). "Watch How It Works" = video dialog (embed ID via env, stub ok).

### 12.4 Dashboard widgets (from `dashboard_screen.jpg`)
`components/dashboard/*`, all fed by parallel TanStack queries:
- `GreetingHero`: greeting + 3 stat cards (Upcoming Bookings, Vehicles, Favorite Car Wash) over car visual.
- `QuickBookPanel`: Service/Vehicle/Date/Time selects → routes to `/search` (or booking flow)
  with prefilled params; gold `Find Availability` CTA.
- `BookingCard`: service image, status chip (`Confirmed` gold-soft / `Completed` teal-soft),
  business + address, date/time, vehicle, GHS total, `View Details` + `Get Directions`
  (Google Maps URL from business lat/lng — no API key).
- `VehicleRow` (+ `Add Vehicle` → vehicles page); `Primary` badge on default vehicle.
- `BusinessCard` (shared with search): photo, ★ rating (gold) + count, distance km,
  category tags, `From {GHS}`, heart favorite toggle (optimistic), `View Services`.
- `WeatherCard`: Open-Meteo `current=temperature_2m,weather_code` by geolocated/city coords
  (keyless, zero-cost) + static wash-suitability line. No key, no proxy, cache 30 min.
- `QuickActions`: chevron rows deep-linking to portals.
- `OfferCard` + `RecentBookings` + `ActivityFeed` (booking/payment/review events) + `QuickLinks` grid.

### 12.5 Backend gaps found (explicit TODOs, not blockers)
- **Promos/discounts:** mockup shows `CLEANRIDE10` 10%-off code — backend has **no promo API**.
  Scaffold as static marketing content; promo-code *redemption* is out of scope until backend adds it.
- **Weather:** no backend endpoint — frontend calls Open-Meteo directly (§12.4).
- **Customer "my reviews":** verify backend list supports `customerId` filter, else filter client-side.
- **Directions:** plain Google Maps URL, no backend needed.
- **Store badges / video embed / testimonials / newsletter:** static/marketing stubs, no backend.

### 12.6 GreetingHero customization contract (`components/dashboard/GreetingHero.tsx`)

Personalized hero band atop the customer dashboard (mockup: "Good Morning, Jacqueline! ☀").
Same component pattern reused for business (`Good Evening, Sparkle Auto Wash`) and admin portals.

**Props:**
```tsx
type HeroStat = { key: "bookings" | "vehicles" | "favorites";
  value: number; label: string; href: string; icon: "calendar" | "car" | "heart" };
type GreetingHeroProps = {
  firstName: string;            // "Jacqueline"
  cityLabel: string;            // "Accra, Ghana" — single source: useLocationLabel()
  stats: HeroStat[];            // 3 stat cards overlaid on the visual
  visualSrc?: string;           // car image; fallback = navy gradient + logo watermark
  cta?: { label: string; href: string };  // empty-state CTA, default "Find a Car Wash"
};
```

**Time-of-day matrix** (local hour → greeting, accent chip, scrim tint):

| Slot | Hours | Greeting | Accent | Visual treatment |
|---|---|---|---|---|
| Dawn | 5–8 | Good Morning | gold sun icon | cool navy scrim |
| Day | 8–17 | Good Afternoon | gold sun icon | light scrim (light theme) / navy (dark) |
| Evening | 17–21 | Good Evening | teal moon icon | deep navy scrim |
| Night | 21–5 | Good Night | teal moon icon | darkest scrim + sparkle |

Subline rotates by context (priority order): next upcoming booking
(`"Your {service} at {business} is {today|tomorrow}, {time}"`) → else default
(`"Your car deserves the best care…"`, mockup copy).

**Stat cards:** glass chips over the visual (mockup: `2 Upcoming Bookings`, `4 Vehicles`,
`1 Favorite Car Wash`); each links to its page; values from parallel queries
(`staleTime 60s`); loading → shimmer skeleton; error → `—` with retained label (hero never blanks).

**Visual layering:** car image right-bleed with left→right navy gradient scrim for text contrast
in **both** themes (stronger scrim in dark); `alt=""` decorative (greeting is the h1);
`fetchpriority="high"`, fixed aspect to avoid CLS; no-image fallback keeps layout identical.

**States & responsive:** `0 bookings` → CTA button replaces third stat emphasis ("Find a Car Wash");
mobile stacks (greeting → stats grid → visual banner 16:9); stats wrap to 3-col mini-grid.
A11y: greeting is the page `h1`; stats are links with `aria-label "{value} {label}"`.

**Hero-zone companions (same location source):** `QuickBookPanel` prefills city/date from
`useLocationLabel()` + default vehicle; `WeatherCard` reuses the same `cityLabel`/coords —
one geolocation resolution per dashboard mount, shared via context, never three separate prompts.

### 12.7 Toast notification system contract (`components/feedback/Toast.tsx`)

Transient toasts confirm **every user-facing activity** (form submits, booking steps, copies,
toggles, errors). Persistent history lives on the notifications page — toasts never replace it,
they mirror the moment. Custom-built (no dep): exact palette + progress-bar control beats
wrapping a library.

**API:**
```tsx
toast.info(title, opts?)     // neutral updates      (default 4s)
toast.success(title, opts?)  // completed actions    (default 4s)
toast.warning(title, opts?)  // needs attention      (default 5s)
toast.danger(title, opts?)   // failures/blockers    (default 6s)
// opts: { description?: string; duration?: number; sticky?: boolean; action?: { label, onClick } }
```

**Card anatomy:** `bg-surface border-border rounded-xl` card (max-w 380px), icon chip left,
title (Montserrat 600) + optional description (Inter, muted), close button, action button —
and a **3px progress bar pinned to the card's bottom edge** that drains `100% → 0` over
`duration` in **primary teal** (`--color-primary`). Bar hits zero → exit animation (slide+fade)
→ unmount. `sticky: true` = no bar, manual dismiss only.

**Variant accents** (bar stays primary; only chip + icon tint change):

| Variant | Chip bg | Icon | ARIA |
|---|---|---|---|
| info | navy-500/15 bg, navy-300/600 icon | `i` | `role="status"` polite |
| success | teal-600/15 bg, primary icon | check | `role="status"` polite |
| warning | gold-500/15 bg, gold-600/400 icon | triangle | `role="alert"` assertive |
| danger | red-600/15 bg, red icon | octagon | `role="alert"` assertive |

**Behavior rules:** bottom-right stack (bottom-center <640px), max 4 visible (oldest evicted);
hover/focus pauses **both** timer and bar (`animation-play-state: paused`); duplicate
`title+description` replaces in place (no spam); `prefers-reduced-motion` → fade only, same timeouts.
Dedupe key + single-flight per form submit (button disabled while pending, §5).

**Form wiring (mandatory):** every mutation toast on settle — success path `toast.success`
(backend message or `"Saved"`), failure path `toast.danger` with `error.message` +
field-mapped inline errors (§5). Booking flow extras: hold-created → `toast.info` with countdown
description; <2 min left → `toast.warning`; copy promo/code → `toast.info "Copied"`;
favorite toggle → optimistic + `toast.success`; read-all notifications → `toast.success`.
