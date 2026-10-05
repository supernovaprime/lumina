# Landing Page — Architecture & Build Spec

> **Source mockup:** `frontend/public/assets/screen.jpg` (follow it faithfully).
> **Route:** `app/page.tsx` (public, SSG, no auth gate).
> **Parent specs:** `FRONTEND.md` §1 (tokens), §1.4 (fonts), §12.3 (section list).
> **Composition order (top → bottom):** Navbar → Hero → Services → HowItWorks →
> Testimonials → AppBand → Footer. No deviations without approval.

---

## 0. Global rules for this page

- **Always-dark brand surfaces:** Navbar, Hero, HowItWorks band, AppBand, Footer render on
  `navy-950` + warm-white text in **both** themes (brand immersion, matches mockup).
  Content sections (Services, Testimonials) adapt via semantic tokens (§1.2).
- **Section rhythm:** `py-16 md:py-24`, container `max-w-7xl mx-auto px-4 md:px-8`.
- **Section header pattern:** Montserrat 700 title left + supporting Inter subcopy under it;
  right-aligned link pill (`View All Services →`, `border-border rounded-full`) where mockup shows one.
- **Buttons:** primary = gold-500 bg + navy-950 text (`rounded-full`, semibold);
  secondary = transparent + white/navy border pill; circle-arrow = gold-500 round button with `→`.
- **Motion:** reveal-on-scroll (IntersectionObserver, translate-y + fade, staggered 80ms);
  card hover lift (`-translate-y-1 shadow-lg`); `prefers-reduced-motion` disables all.
- **Images:** hero car `fetchpriority="high"`; everything below fold `loading="lazy"`;
  all decorative images `alt=""`, informative get descriptive alt.
- **SEO:** title `Lumina — Cleaner Cars. Brighter Days.`, meta description, OG image = `logo.jpg`.

---

## 1. Navbar (`components/landing/Navbar.tsx`, client — scroll state + mobile menu)

**Desktop layout (h-16/20, sticky, navy-950/90 backdrop-blur, border-b white/10):**
- Left: logo mark (`Logo (2).svg`, h-9) + wordmark stack — "CarWash" Montserrat 800
  (white + gold "Wash" segment) + tagline `Clean Rides. Better Days.` (10px, muted).
  (Wordmark text updates to Lumina brand at implementation; layout unchanged.)
- Center: links Home (active gold underline), Services, Find a Car Wash, About, Contact —
  Inter 500, white/80, hover white. `Find a Car Wash` → `/search`; rest → anchors (`#services`,
  `#how-it-works`, `#about`→footer block, `#contact`→footer) until dedicated pages exist.
- Right: search icon-button (→ `/search`, autofocus query), `Log In` (outline pill → `/login`),
  `Sign Up` (gold pill → `/register`).
- Scrolled >24px: add shadow + solid bg. Mobile (<lg): hamburger → slide-down panel with
  links + both CTAs; focus-trapped, Esc closes, `aria-expanded` on trigger.

---

## 2. Hero (`components/landing/Hero.tsx`, server + client CTA row)

**Grid:** 2-col (`lg:grid-cols-[1.05fr_1fr]`), left copy on navy-950, right car visual full-bleed
with left→right navy scrim (text contrast, both themes identical here).
- Eyebrow: gold-outlined pill `PREMIUM CAR WASH SERVICE →` (11px, tracking-widest, gold-400).
- H1 Montserrat 800, `text-4xl md:text-6xl`: line 1 white `Your Car Deserves`,
  line 2 gold-500 `The Best Care`.
- Subcopy (Inter, white/70, max-w-md): *"Book your car wash in minutes. Find trusted car wash
  businesses near you, compare services, and enjoy a cleaner, shinier ride."*
- CTAs: `Find a Car Wash →` (gold pill → `/search`) + `▶ Watch How It Works`
  (outline pill → video dialog, YouTube embed ID from `NEXT_PUBLIC_HOWTO_VIDEO_ID`, stub ok).
- Trust row (3 items, icon in gold-ring circle + bold label + muted sub):
  `Trusted Businesses / Verified & reviewed` · `Top Rated Services / Quality you can count on` ·
  `Convenient Locations / Near you, always`.
- Script accent over visual (caveat-style italic serif fallback — use Montserrat italic 600 gold):
  *"Clean Today, Shine Tomorrow"* with gold underline stroke. Position absolute bottom-right
  of visual, hidden <md (no overlap crunch).
- Visual: car-wash splash photo, right-anchored, `rounded-l-3xl` on desktop; CLS-safe fixed aspect.

---

## 3. Services (`components/landing/ServicesGrid.tsx` + `ServiceCard.tsx`)

Header row: `Our Services` (Montserrat 700, foreground) + subcopy
*"Choose from a variety of professional car wash and detailing services."* + right pill
`View All Services →` (→ `/search`).
**Grid:** 5 cards desktop (`grid-cols-2 md:grid-cols-3 xl:grid-cols-5`), horizontal snap-scroll <md.
**Card (static data, `lib/data/services.ts`):**

| # | Title | Copy | From | Icon |
|---|---|---|---|---|
| 1 | Basic Wash | A quick and effective clean for your everyday ride. | GHS 50 | car |
| 2 | Premium Wash | Deep clean with extra care for a flawless finish. | GHS 80 | sparkles |
| 3 | Full Detail | Inside and out. Because your car deserves more. | GHS 120 | seat/spray |
| 4 | Wax & Polish | Long-lasting shine and protection. | GHS 100 | shield |
| 5 | Interior Cleaning | Fresh, clean and comfortable interiors. | GHS 70 | vacuum/seat |

Card anatomy: photo top (rounded-t-xl, h-36, lazy), gold icon-chip overlapping bottom-left edge,
title (Montserrat 600), 2-line desc (Inter sm muted, `line-clamp-2`), footer row:
`From GHS {n}` (mono, semibold) + gold circle-arrow button (→ `/search?service={slug}`).
Hover: lift + arrow slides. Category slugs map to backend `ServiceCategory`
(`EXTERIOR/INTERIOR/FULL_WASH/DETAILING/ADD_ONS` — card→filter mapping table in code comments).

---

## 4. How It Works (`components/landing/HowItWorks.tsx` — always-dark band)

Navy-950 band, 2-col: left steps, right image w/ caption.
Header: `How It Works` (white) + subcopy *"Get your car washed in just a few simple steps."*
**Steps (numbered gold-ring circles, dashed gold connector arrows):**
1. `Find a Car Wash` — *Search for nearby car washes or browse our list of trusted partners.* (icon: search)
2. `Book a Service` — *Choose your service, preferred date and time.* (icon: calendar)
3. `Get Your Car Washed` — *Relax while our professionals take care of your vehicle.* (icon: car)
4. `Enjoy the Results` — *Drive away clean, fresh and confident.* (icon: sparkles)
Number badge (`1` gold chip on ring) + title white semibold + desc white/60 sm.
Right visual: car detail photo rounded-2xl + script caption *"It's More Than Just a Wash"*
(Montserrat italic gold, gold underline). Mobile: steps stack vertical, connectors rotate 90°.

---

## 5. Testimonials (`components/landing/Testimonials.tsx` — adaptive surface)

Header: `What Our Customers Say` + subcopy *"Real people. Real experiences."* + right arrow pair
(prev/next round outline buttons). Cards (static `lib/data/testimonials.ts`):
avatar (round, h-12) + 5 gold stars + quote (Inter, foreground) + name (Montserrat 600) + `Customer` (muted xs).
Mockup trio: **Ama Serwaa** (*"The process was so easy and convenient. My car has never looked better!"*),
**Kwame Mensah** (*"Great service, friendly staff and very professional. Highly recommend!"*),
**Efua Boateng** (*"I love the app! Booking is quick and I can find a car wash near me in seconds."*).
Behavior: scroll-snap row + arrow scroll + dots; auto-advance 6s paused on hover/focus; ARIA
`role="region" aria-roledescription="carousel"`, arrows labeled. 1 card mobile / 3 desktop.

---

## 6. AppBand (`components/landing/AppBand.tsx` — always-dark)

Dark band with interior-car backdrop + right phone visual (hand holding phone showing mini app —
reuse `dashboard_screen.jpg` crop or logo splash; lazy).
Eyebrow gold `DOWNLOAD OUR APP` + H2 Montserrat 800 white `Clean Rides, Right at Your Fingertips` +
copy *"Book, pay and manage your car wash services anytime, anywhere."*
Store badges: App Store + Google Play images, rendered **disabled with `Coming soon` tooltip**
(no apps exist — never dead-link). Captions honest: no fake QR.

---

## 7. Footer (`components/layout/Footer.tsx` — always-dark navy-950)

4 columns: (1) logo stack + blurb + © line `© 2025 CarWash. All rights reserved.`
(2) `Quick Links`: Home, Services, Find a Car Wash, About Us, Contact
(3) `Support`: Help & Support, FAQs, Terms & Conditions, Privacy Policy (stub `/legal/*` pages OK)
(4) `Stay Connected`: social icon-buttons (Facebook, Instagram, X, YouTube — `href="#"` with
`aria-label`, swap when handles exist) + newsletter form (email input + gold submit →
validate → `toast.success "You're subscribed"` stub; no backend yet — TODO comment).
Bottom bar: left © line, right script tagline `Clean Rides, Better Days.` (gold italic).

---

## 8. Build checklist (sign-off gates)

- [ ] Pixel-compare each section vs `screen.jpg` (desktop 1440 + mobile 390), light + dark.
- [ ] All copy verbatim from §1–7 deck; prices via `formatGHS` (never hardcoded `GH₵` strings).
- [ ] Lighthouse ≥90 performance on `/` (hero priority image, lazy below fold, no layout shift).
- [ ] A11y pass: landmarks (`header/main/footer`), one h1, focus-visible rings, carousel roles,
      color contrast ≥4.5 on all text (gold-on-navy and navy-on-gold checked).
- [ ] Dead-end audit: every button/link resolves (page, anchor, dialog, or honest disabled+tooltip).
