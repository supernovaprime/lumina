import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  Repeat2,
  Sparkles,
  Star,
} from "lucide-react";

import { SectionFrame, SectionHeading } from "@/components/landing/SectionFrame";
import { glassCardClass } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

const testimonials = [
  {
    quote:
      "Booked a full detail in under a minute. The car looked showroom-new when I picked it up.",
    name: "Ama Serwaa",
    location: "East Legon",
    avatar: "/assets/avatar-ama-serwaa.jpg",
    service: "Full detail",
  },
  {
    quote:
      "The upfront price is what sold me. No haggling at the bay, and the slot started on time.",
    name: "Kwame Mensah",
    location: "Osu",
    avatar: "/assets/avatar-kwame-mensah.jpg",
    service: "Price locked",
  },
  {
    quote:
      "The interior reset saved my seats after a beach weekend. I've already booked again.",
    name: "Efua Boateng",
    location: "Labone",
    avatar: "/assets/avatar-efua-boateng.jpg",
    service: "Interior reset",
  },
];

function Stars({ className }: { className?: string }) {
  return (
    <div
      role="img"
      aria-label="5 out of 5 stars"
      className={cn("flex items-center gap-0.5 text-sea-400", className)}
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          aria-hidden="true"
          className="size-3.5 fill-current"
        />
      ))}
    </div>
  );
}

function VerifiedChip({
  label = "Verified",
  inverted = false,
}: {
  label?: string;
  inverted?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 font-mono text-label uppercase tracking-[0.14em]",
        inverted
          ? "border-white/15 bg-white/10 text-sea-100"
          : "border-sea-500/20 bg-sea-500/10 text-sea-700 dark:text-sea-300"
      )}
    >
      <BadgeCheck aria-hidden="true" className="size-3.5" />
      {label}
    </span>
  );
}

function ServiceTag({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/45 bg-white/35 px-2.5 py-1 text-label text-muted-foreground dark:border-white/[0.08] dark:bg-white/[0.04]">
      {children}
    </span>
  );
}

export function Testimonials() {
  return (
    <SectionFrame id="testimonials" tone="sunken">
      <SectionHeading
        eyebrow="Driver reviews"
        title={
          <>
            Loved by drivers across{" "}
            <em className="font-normal italic text-sea-600 dark:text-sea-300">
              Accra.
            </em>
          </>
        }
        description="Real bookings, real cars, real shine. Here's what drivers say after their first wash."
      />

      <div className="mt-12 grid gap-4 lg:grid-cols-12">
        <figure
          className={glassCardClass(
            "group flex flex-col p-6 hover:-translate-y-0.5 hover:border-sea-500/35 sm:p-8 lg:col-span-7 lg:row-span-2"
          )}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-2 -top-12 font-display text-[13rem] leading-none text-sea-500/[0.08]"
          >
            “
          </span>

          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <Stars />
            <VerifiedChip />
          </div>

          <blockquote className="relative mt-7 flex-1 text-pretty font-display text-[1.7rem] leading-[1.25] text-foreground sm:text-[2rem]">
            “{testimonials[0].quote}”
          </blockquote>

          <div className="relative mt-6 flex flex-wrap gap-2">
            <ServiceTag>{testimonials[0].service}</ServiceTag>
            <ServiceTag>Under 1 min</ServiceTag>
          </div>

          <figcaption className="relative mt-7 flex items-center gap-3.5 border-t border-white/45 pt-6 dark:border-white/10">
            <Image
              src={testimonials[0].avatar}
              alt=""
              width={52}
              height={52}
              className="size-12 rounded-full object-cover ring-2 ring-white/60 dark:ring-white/15"
            />
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-caption font-semibold text-foreground">
                {testimonials[0].name}
                <BadgeCheck
                  aria-hidden="true"
                  className="size-3.5 text-sea-600 dark:text-sea-300"
                />
              </p>
              <p className="text-label text-muted-foreground">
                {testimonials[0].location}
              </p>
            </div>
          </figcaption>
        </figure>

        <aside className="relative overflow-hidden rounded-2xl border border-white/10 bg-sea-950 p-6 text-paper shadow-[0_30px_80px_-46px_rgba(0,0,0,0.9)] lg:col-span-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-sky-400/25 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -left-20 size-56 rounded-full bg-sea-500/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sea-300/50 to-transparent"
          />

          <div className="relative flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-label uppercase tracking-[0.18em] text-sea-300">
              Overall rating
            </p>
            <VerifiedChip label="Verified reviews" inverted />
          </div>

          <div className="relative mt-5 flex items-end gap-2">
            <p className="font-display text-6xl font-semibold leading-none tracking-tight">
              4.9
            </p>
            <p className="pb-1.5 text-body-sm text-sea-300">/ 5</p>
          </div>
          <Stars className="relative mt-4 text-sky-300" />

          <div className="relative mt-7 flex items-center justify-between gap-4 border-t border-white/10 pt-5">
            <div className="flex -space-x-2.5">
              {testimonials.map((testimonial) => (
                <Image
                  key={testimonial.name}
                  src={testimonial.avatar}
                  alt=""
                  width={36}
                  height={36}
                  className="size-9 rounded-full border-2 border-sea-950 object-cover"
                />
              ))}
            </div>
            <div className="text-right">
              <p className="text-caption font-semibold text-paper">
                1,200+ cars detailed
              </p>
              <p className="mt-0.5 text-label text-sea-300/70">Across Accra</p>
            </div>
          </div>
        </aside>

        <figure
          className={glassCardClass(
            "flex flex-col p-6 hover:-translate-y-0.5 hover:border-sea-500/35 lg:col-span-5"
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <Stars />
            <span className="text-label text-muted-foreground">
              {testimonials[1].service}
            </span>
          </div>

          <blockquote className="mt-5 flex-1 text-pretty text-body-sm leading-relaxed text-foreground">
            “{testimonials[1].quote}”
          </blockquote>

          <figcaption className="mt-5 flex items-center gap-3 border-t border-white/45 pt-5 dark:border-white/10">
            <Image
              src={testimonials[1].avatar}
              alt=""
              width={40}
              height={40}
              className="size-10 rounded-full object-cover ring-2 ring-white/60 dark:ring-white/15"
            />
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-caption font-semibold text-foreground">
                {testimonials[1].name}
                <BadgeCheck
                  aria-hidden="true"
                  className="size-3.5 text-sea-600 dark:text-sea-300"
                />
              </p>
              <p className="text-label text-muted-foreground">
                {testimonials[1].location}
              </p>
            </div>
          </figcaption>
        </figure>

        <figure
          className={glassCardClass(
            "flex flex-col gap-6 p-6 hover:-translate-y-0.5 hover:border-sea-500/35 sm:grid sm:grid-cols-[1fr_auto] sm:items-end sm:gap-8 sm:p-8 lg:col-span-8"
          )}
        >
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <Stars />
              <ServiceTag>{testimonials[2].service}</ServiceTag>
            </div>
            <blockquote className="mt-4 text-pretty text-body-sm leading-relaxed text-foreground sm:text-body">
              “{testimonials[2].quote}”
            </blockquote>
            <figcaption className="mt-5 flex items-center gap-3">
              <Image
                src={testimonials[2].avatar}
                alt=""
                width={40}
                height={40}
                className="size-10 rounded-full object-cover ring-2 ring-white/60 dark:ring-white/15"
              />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-caption font-semibold text-foreground">
                  {testimonials[2].name}
                  <BadgeCheck
                    aria-hidden="true"
                    className="size-3.5 text-sea-600 dark:text-sea-300"
                  />
                </p>
                <p className="text-label text-muted-foreground">
                  {testimonials[2].location}
                </p>
              </div>
            </figcaption>
          </div>

          <div className="flex items-center gap-3 border-t border-white/45 pt-5 dark:border-white/10 sm:flex-col sm:items-end sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
            <span className="grid size-10 place-items-center rounded-full bg-sea-500/10 text-sea-700 dark:text-sea-300">
              <Repeat2 aria-hidden="true" className="size-4" />
            </span>
            <div className="sm:text-right">
              <p className="font-mono text-label uppercase tracking-[0.14em] text-muted-foreground">
                Booked again
              </p>
              <p className="mt-1 text-caption font-medium text-foreground">
                After a beach weekend
              </p>
            </div>
          </div>
        </figure>

        <Link
          href="/search"
          className={glassCardClass(
            "group flex flex-col justify-between gap-8 p-6 hover:-translate-y-0.5 hover:border-sea-500/35 lg:col-span-4"
          )}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-sea-400/15 blur-2xl transition-transform duration-500 group-hover:scale-125"
          />

          <div className="relative flex items-start justify-between gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-sea-500/10 text-sea-700 dark:text-sea-300">
              <Sparkles aria-hidden="true" className="size-4" />
            </span>
            <ArrowUpRight
              aria-hidden="true"
              className="size-5 text-muted-foreground transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-sea-600 dark:group-hover:text-sea-300"
            />
          </div>

          <div className="relative">
            <p className="font-display text-2xl font-semibold leading-tight text-foreground">
              Your wash next?
            </p>
            <p className="mt-2 text-caption leading-relaxed text-muted-foreground">
              Book a trusted wash in under a minute.
            </p>
            <span className="mt-5 inline-flex items-center text-caption font-medium text-sea-700 dark:text-sea-300">
              Browse washes
            </span>
          </div>
        </Link>
      </div>
    </SectionFrame>
  );
}
