"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarCheck,
  MapPin,
  Scale,
  type LucideIcon,
} from "lucide-react";

import { StickyScroll } from "@/components/ui/sticky-scroll-reveal";
import { GlassCard, glassCardClass } from "@/components/ui/glass-card";
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

function IllustrationPanel() {
  return (
    <GlassCard className="relative flex h-[440px] items-center justify-center overflow-hidden p-6">
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
          src="/assets/Car%20wash-bro.svg"
          alt=""
          width={750}
          height={500}
          loading="lazy"
          decoding="async"
          className="h-auto w-full max-w-[440px] object-contain drop-shadow-[0_24px_40px_rgba(4,28,40,0.18)]"
        />
      </div>
    </GlassCard>
  );
}

export function StepScroll() {
  return (
    <StickyScroll
      className="mt-12"
      content={steps}
      aside={<IllustrationPanel />}
      renderCard={(_item, index, active) => {
        const step = steps[index];
        const Icon = step.icon;
        const isFirst = index === 0;

        return (
          <motion.div
            animate={{ opacity: active ? 1 : 0.55, y: active ? 0 : 6 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className={glassCardClass(
              cn(
                "flex flex-col p-5 hover:border-sea-500/35 sm:p-6",
                active && "border-sea-500/35"
              )
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
              <div className="relative mt-4 rounded-xl border border-white/45 bg-white/30 p-2.5 dark:border-white/[0.08] dark:bg-white/[0.035]">
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
                      className="flex items-center justify-between gap-3 rounded-lg border border-white/40 bg-white/40 px-2.5 py-2 dark:border-white/[0.07] dark:bg-white/[0.04]"
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
          </motion.div>
        );
      }}
    />
  );
}
