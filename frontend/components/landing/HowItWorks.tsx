import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  MapPin,
  Scale,
  type LucideIcon,
} from "lucide-react";

import { SectionFrame, SectionHeading } from "@/components/landing/SectionFrame";
import { GlassCard } from "@/components/ui/glass-card";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Step = {
  title: string;
  description: string;
  meta: string;
  icon: LucideIcon;
};

const steps: Step[] = [
  {
    title: "Find a wash near you",
    description:
      "Search by neighbourhood or let Lumina show trusted partners around you.",
    meta: "Search",
    icon: MapPin,
  },
  {
    title: "Compare price and time",
    description:
      "See real prices, services, and live slots. No calls, no haggling.",
    meta: "Compare",
    icon: Scale,
  },
  {
    title: "Book and shine",
    description:
      "Choose a slot, pay in-app, and get a receipt. Then just show up.",
    meta: "Book",
    icon: CalendarCheck,
  },
];

const nearbyWashes = [
  { name: "East Legon Auto Spa", meta: "1.2 km · from GHS 60", time: "10:30" },
  { name: "Labone Detail Studio", meta: "2.8 km · from GHS 90", time: "11:15" },
  { name: "Osu Wash House", meta: "3.4 km · from GHS 75", time: "12:00" },
];

export function HowItWorks() {
  return (
    <SectionFrame id="how-it-works" tone="sunken">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeading
          eyebrow="How it works"
          title={
            <>
              From pin to shine in{" "}
              <em className="font-normal italic text-sea-600 dark:text-sea-300">
                three
              </em>{" "}
              steps.
            </>
          }
          description="No phone calls, no driving around. Lumina puts every trusted wash in one place."
        />
        <Link
          href="/search"
          className={buttonClass({
            variant: "outline",
            size: "default",
            className: "group shrink-0",
          })}
        >
          Browse washes
          <ArrowRight
            aria-hidden="true"
            className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      <div className="mt-12 grid gap-4 lg:grid-cols-12">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isFirst = index === 0;

          return (
            <GlassCard
              key={step.title}
              className={cn(
                "flex flex-col p-6 hover:border-sea-500/35 sm:p-7",
                isFirst ? "lg:col-span-7 lg:row-span-2" : "lg:col-span-5"
              )}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 -top-12 size-44 rounded-full bg-sky-400/10 blur-3xl"
              />

              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-xl border border-sea-500/25 bg-sea-500/10 text-sea-700 dark:text-sea-300">
                    <Icon
                      aria-hidden="true"
                      className="size-5"
                      strokeWidth={1.75}
                    />
                  </span>
                  <span className="font-mono text-label uppercase tracking-[0.16em] text-muted-foreground">
                    0{index + 1} · {step.meta}
                  </span>
                </div>
                <span
                  aria-hidden="true"
                  className="font-display text-5xl font-semibold leading-none text-sea-500/15 sm:text-6xl"
                >
                  0{index + 1}
                </span>
              </div>

              <h3 className="relative mt-6 font-display text-h3 font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="relative mt-2 max-w-md text-body-sm text-muted-foreground">
                {step.description}
              </p>

              {isFirst ? (
                <div className="relative mt-6 rounded-xl border border-white/45 bg-white/30 p-3 dark:border-white/[0.08] dark:bg-white/[0.035]">
                  <div className="flex items-center justify-between gap-3 px-1 pb-2">
                    <span className="flex items-center gap-1.5 font-mono text-label uppercase tracking-[0.14em] text-muted-foreground">
                      <MapPin
                        aria-hidden="true"
                        className="size-3 text-sea-600 dark:text-sea-300"
                      />
                      Near you
                    </span>
                    <span className="flex items-center gap-1.5 text-label text-muted-foreground">
                      <span className="size-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
                      Live
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {nearbyWashes.map((wash) => (
                      <div
                        key={wash.name}
                        className="flex items-center justify-between gap-3 rounded-lg border border-white/40 bg-white/40 px-3 py-2.5 dark:border-white/[0.07] dark:bg-white/[0.04]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-caption font-medium text-foreground">
                            {wash.name}
                          </p>
                          <p className="truncate text-label text-muted-foreground">
                            {wash.meta}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full border border-sky-400/25 bg-sky-400/10 px-2 py-1 font-mono text-label text-foreground">
                          {wash.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="relative mt-auto flex items-center justify-between gap-3 pt-6">
                <span className="text-label text-muted-foreground">
                  Step 0{index + 1} of 03
                </span>
                {isFirst ? (
                  <Link
                    href="/search"
                    className="group inline-flex items-center gap-1 text-caption font-medium text-sea-700 transition-colors hover:text-sea-600 dark:text-sea-300 dark:hover:text-sea-200"
                  >
                    Search near you
                    <ArrowRight
                      aria-hidden="true"
                      className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                    />
                  </Link>
                ) : null}
              </div>
            </GlassCard>
          );
        })}

        <GlassCard className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between lg:col-span-12">
          <div className="flex items-center gap-3">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-sky-300 opacity-60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-sky-300" />
            </span>
            <div>
              <p className="text-body-sm font-semibold text-foreground">
                24 washes open right now
              </p>
              <p className="mt-0.5 text-caption text-muted-foreground">
                Availability updates as partners confirm slots.
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
            Browse washes
            <ArrowRight
              aria-hidden="true"
              className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        </GlassCard>
      </div>
    </SectionFrame>
  );
}
