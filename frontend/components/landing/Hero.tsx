import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  Clock,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";
import { VideoButton } from "@/components/landing/VideoButton";
import { serviceCategories } from "@/lib/data/services";

const trustItems = [
  { icon: ShieldCheck, title: "Verified partners", sub: "Background checked" },
  { icon: Star, title: "Top-rated care", sub: "Real customer reviews" },
  { icon: MapPin, title: "Near you", sub: "Live local availability" },
];

export function Hero() {
  return (
    <section aria-labelledby="hero-heading" className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-12 md:px-8 md:pt-16 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:pb-24">
        <Reveal>
          <p className="inline-flex items-center gap-2 rounded-full border border-gold-600/60 bg-gold-500/5 px-4 py-1.5 text-[11px] font-semibold tracking-[0.18em] text-gold-700 dark:border-gold-500/60 dark:text-gold-400">
            <Sparkles size={13} aria-hidden="true" />
            PREMIUM CAR CARE, ON DEMAND
          </p>

          <h1
            id="hero-heading"
            className="mt-5 font-display text-4xl font-extrabold leading-[1.03] tracking-tight text-foreground md:text-6xl"
          >
            Your Car Deserves
            <span className="mt-1 block bg-gradient-to-r from-gold-600 via-gold-500 to-gold-300 bg-clip-text text-transparent dark:from-gold-400 dark:via-gold-300 dark:to-gold-200">
              The Best Care
            </span>
          </h1>

          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted">
            Book a trusted car wash in minutes. Compare services, check live
            availability and lock in your slot — no phone calls, no guesswork.
          </p>

          <form
            action="/search"
            method="get"
            role="search"
            aria-label="Find a car wash"
            className="mt-8 grid gap-2 rounded-2xl bg-background/85 p-2 shadow-lg shadow-navy-950/5 backdrop-blur-md sm:grid-cols-[1.25fr_1fr_auto]"
          >
            <label className="flex items-center gap-2 rounded-xl px-3 py-2 transition focus-within:ring-2 focus-within:ring-ring">
              <MapPin size={16} className="shrink-0 text-tertiary" aria-hidden="true" />
              <span className="sr-only">Location</span>
              <input
                type="text"
                name="location"
                placeholder="Where are you?"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
              />
            </label>
            <label className="flex items-center gap-2 rounded-xl border-t border-black/5 px-3 py-2 transition focus-within:ring-2 focus-within:ring-ring dark:border-white/10 sm:border-l sm:border-t-0">
              <Sparkles size={16} className="shrink-0 text-gold-600 dark:text-gold-400" aria-hidden="true" />
              <span className="sr-only">Service</span>
              <select
                name="service"
                defaultValue=""
                className="w-full cursor-pointer bg-transparent text-sm text-foreground outline-none"
              >
                <option value="" className="bg-background text-foreground">Any service</option>
                {serviceCategories.map((service) => (
                  <option key={service.slug} value={service.backendFilter} className="bg-background text-foreground">
                    {service.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-semibold text-navy-950 transition hover:bg-gold-400 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Search size={16} aria-hidden="true" /> Search
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-3.5">
            <Link
              href="/search"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-fg transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Find a Car Wash <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <VideoButton />
          </div>

          <dl className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {trustItems.map((item) => (
              <div
                key={item.title}
                className="rounded-xl bg-background/80 px-4 py-3 shadow-sm backdrop-blur-sm"
              >
                <dt className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gold-600/50 text-gold-600 dark:border-gold-500/50 dark:text-gold-400">
                    <item.icon size={13} aria-hidden="true" />
                  </span>
                  {item.title}
                </dt>
                <dd className="mt-1 text-xs text-muted">{item.sub}</dd>
              </div>
            ))}
          </dl>
        </Reveal>

        <Reveal delayMs={120} className="relative">
          <div className="grid grid-cols-6 gap-3">
            <div className="relative col-span-6 overflow-hidden rounded-3xl bg-navy-950 shadow-lg shadow-navy-950/10">
              <div className="relative h-[280px] w-full md:h-[360px]">
                <Image
                  src="/assets/hero-car.jpg"
                  alt="A freshly washed car gleaming after a premium wash"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover opacity-90 transition-transform duration-700 hover:scale-105"
                />
              </div>
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/25 to-transparent"
              />
              <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-navy-950/60 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-white backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" aria-hidden="true" />
                LIVE · 24 washes nearby
              </div>
              <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4">
                <div>
                  <p className="font-display text-2xl font-extrabold leading-tight text-white md:text-3xl">
                    Spotless in
                    <span className="block text-gold-400">under an hour.</span>
                  </p>
                  <p className="mt-2 text-xs text-white/70">
                    Verified partners · transparent pricing
                  </p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-center backdrop-blur">
                  <p className="font-display text-lg font-extrabold text-white">4.9</p>
                  <p className="text-[10px] uppercase tracking-wide text-white/70">
                    Rating
                  </p>
                </div>
              </div>
            </div>

            <div className="col-span-3 rounded-2xl bg-background/85 p-4 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Next slot
                </p>
                <Clock size={15} className="text-tertiary" aria-hidden="true" />
              </div>
              <p className="mt-2 font-display text-2xl font-extrabold text-foreground">
                09:30
              </p>
              <p className="text-xs text-muted">Today · 1.8 km away</p>
            </div>

            <div className="col-span-3 rounded-2xl bg-background/85 p-4 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Avg. booking
                </p>
                <CalendarCheck
                  size={15}
                  className="text-gold-600 dark:text-gold-400"
                  aria-hidden="true"
                />
              </div>
              <p className="mt-2 font-display text-2xl font-extrabold text-foreground">
                3 min
              </p>
              <p className="text-xs text-muted">No calls, no queues</p>
            </div>
          </div>

          <div className="pointer-events-none absolute -left-4 top-10 hidden w-44 -rotate-3 rounded-2xl bg-background/95 p-4 shadow-xl shadow-navy-950/10 backdrop-blur-md animate-float-slow xl:block">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
              Wash status
            </p>
            <p className="mt-1 font-display text-sm font-bold text-foreground">
              Foam &amp; rinse
            </p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-teal-500 to-gold-500" />
            </div>
            <p className="mt-2 text-[11px] text-muted">65% complete · 12 min left</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
