import Link from "next/link";
import {
  Armchair,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock,
  Droplets,
  Info,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { SectionFrame, SectionHeading } from "@/components/landing/SectionFrame";
import { GlassCard } from "@/components/ui/glass-card";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Service = {
  name: string;
  price: string;
  duration: string;
  description: string;
  icon: LucideIcon;
  featured?: boolean;
  includes?: string[];
};

const services: Service[] = [
  {
    name: "Signature detail",
    price: "180",
    duration: "2–3 hrs",
    description:
      "Inside and out. A paint-safe wash, tyre dressing, and a full interior clean.",
    icon: Sparkles,
    featured: true,
    includes: [
      "Paint-safe foam wash",
      "Hand dry & tyre dressing",
      "Interior vacuum & wipe-down",
      "Glass and trim finish",
    ],
  },
  {
    name: "Express wash",
    price: "60",
    duration: "20–30 min",
    description:
      "A fast exterior wash, hand-dried and finished with a streak-free shine.",
    icon: Droplets,
  },
  {
    name: "Interior reset",
    price: "120",
    duration: "45–60 min",
    description:
      "Deep-clean seats, carpets, and trim with a fresh finish that lasts.",
    icon: Armchair,
  },
];

export function Services() {
  return (
    <SectionFrame id="services">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeading
          eyebrow="Services"
          title={
            <>
              Three ways to a{" "}
              <em className="font-normal italic text-sea-600 dark:text-sea-300">
                brighter
              </em>{" "}
              shine.
            </>
          }
          description="Pick the level of care. Every booking includes verified partners, upfront pricing, and a real time slot."
        />
        <Link
          href="#how-it-works"
          className="group inline-flex shrink-0 items-center gap-1.5 text-caption font-medium text-sea-700 transition-colors hover:text-sea-600 dark:text-sea-300 dark:hover:text-sea-200"
        >
          How booking works
          <ArrowUpRight
            aria-hidden="true"
            className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      <div className="mt-12 flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2">
        {services.map((service) => {
          const Icon = service.icon;

          return (
            <GlassCard
              key={service.name}
              className={cn(
                "group flex flex-col p-6 hover:-translate-y-0.5 hover:border-sea-500/35",
                service.featured && "sm:col-span-2 lg:p-8"
              )}
            >
              <div
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute -right-10 -top-14 rounded-full bg-sea-400/15 blur-3xl",
                  service.featured ? "size-56" : "size-36"
                )}
              />

              <div className="relative flex items-start justify-between gap-4">
                <span
                  className={cn(
                    "grid place-items-center rounded-xl border border-sea-500/20 bg-sea-500/10 text-sea-700 dark:text-sea-300",
                    service.featured ? "size-12" : "size-11"
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    className={service.featured ? "size-6" : "size-5"}
                    strokeWidth={1.75}
                  />
                </span>

                {service.featured ? (
                  <span className="rounded-full border border-sea-500/25 bg-sea-500/10 px-2.5 py-1 font-mono text-label uppercase tracking-[0.12em] text-sea-700 dark:text-sea-300">
                    Most popular
                  </span>
                ) : (
                  <span className="font-mono text-label uppercase tracking-[0.12em] text-muted-foreground">
                    From GHS
                  </span>
                )}
              </div>

              <h3
                className={cn(
                  "relative mt-6 font-display font-semibold text-foreground",
                  service.featured ? "text-3xl" : "text-h3"
                )}
              >
                {service.name}
              </h3>
              <p className="relative mt-2 max-w-md text-body-sm text-muted-foreground">
                {service.description}
              </p>

              <div className="relative mt-5 flex items-baseline gap-1.5">
                {service.featured ? (
                  <span className="font-mono text-label uppercase tracking-[0.12em] text-muted-foreground">
                    From GHS
                  </span>
                ) : null}
                <span
                  className={cn(
                    "font-display font-semibold text-foreground",
                    service.featured ? "text-4xl" : "text-2xl"
                  )}
                >
                  {service.price}
                </span>
              </div>

              {service.includes ? (
                <ul className="relative mt-6 grid gap-2.5 sm:grid-cols-2">
                  {service.includes.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-caption text-muted-foreground"
                    >
                      <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-300">
                        <Check
                          aria-hidden="true"
                          className="size-2.5"
                          strokeWidth={3}
                        />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="relative mt-auto flex items-center justify-between gap-3 border-t border-white/40 pt-5 dark:border-white/10">
                <span className="flex items-center gap-1.5 text-caption text-muted-foreground">
                  <Clock aria-hidden="true" className="size-3.5" />
                  {service.duration}
                </span>
                <Link
                  href="/search"
                  className="inline-flex items-center gap-1 text-caption font-medium text-sea-700 transition-colors hover:text-sea-600 dark:text-sea-300 dark:hover:text-sea-200"
                >
                  {service.featured ? "Book signature" : "Compare"}
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </Link>
              </div>
            </GlassCard>
          );
        })}
        </div>

        <GlassCard className="relative flex min-h-[280px] items-center justify-center overflow-hidden p-6 sm:min-h-[340px] lg:min-h-0 lg:w-[360px] lg:shrink-0 xl:w-[420px]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-12 size-56 rounded-full bg-sky-400/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-14 -left-10 size-44 rounded-full bg-sea-500/15 blur-3xl"
          />
          <div className="relative flex h-full w-full items-center justify-center rounded-[1.5rem] border border-white/40 bg-gradient-to-br from-white/50 via-white/20 to-sea-300/20 p-5 dark:border-white/10 dark:from-white/[0.06] dark:via-white/[0.02] dark:to-sea-500/10">
            <img
              src="/assets/City%20driver-rafiki.svg"
              alt=""
              width={500}
              height={500}
              loading="lazy"
              decoding="async"
              className="h-auto w-full max-w-[320px] object-contain drop-shadow-[0_24px_40px_rgba(4,28,40,0.18)] lg:max-w-[380px]"
            />
          </div>
        </GlassCard>
      </div>

      <GlassCard className="mt-8 flex flex-col gap-5 p-6 hover:border-sea-500/35 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-sky-400/25 bg-sky-400/10 text-sky-600 dark:text-sky-300">
            <Info aria-hidden="true" className="size-5" strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-body-sm font-semibold text-foreground">
              Not sure which wash to pick?
            </p>
            <p className="mt-0.5 text-caption text-muted-foreground">
              Compare live prices and availability from every partner in Accra.
            </p>
          </div>
        </div>

        <Link
          href="/search"
          className={buttonClass({
            variant: "outline",
            size: "default",
            className: "group shrink-0",
          })}
        >
          Compare all washes
          <ArrowRight
            aria-hidden="true"
            className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
      </GlassCard>

    </SectionFrame>
  );
}
