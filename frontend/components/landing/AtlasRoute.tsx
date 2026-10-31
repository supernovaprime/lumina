"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import {
  CalendarCheck,
  CheckCircle2,
  Search,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Phase = {
  icon: LucideIcon;
  step: string;
  title: string;
  detail: string;
  short: string;
};

const phases: Phase[] = [
  {
    icon: Search,
    step: "Step 01",
    title: "Search your area",
    detail: "Compare verified partners and services near you.",
    short: "Search",
  },
  {
    icon: CalendarCheck,
    step: "Step 02",
    title: "Pick a time that works",
    detail: "See prices and available slots before you book.",
    short: "Book",
  },
  {
    icon: CheckCircle2,
    step: "Step 03",
    title: "Drive away clean",
    detail: "Your booking is confirmed and your slot is held.",
    short: "Clean",
  },
];

export function AtlasRoute() {
  const [phase, setPhase] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) {
      setPhase(2);
      return;
    }

    const id = window.setInterval(() => {
      setPhase((current) => (current + 1) % phases.length);
    }, 2800);

    return () => window.clearInterval(id);
  }, [reduce]);

  const current = phases[phase];
  const Icon = current.icon;

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5 md:px-5">
          <div>
            <p className="text-label font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              The Lumina route
            </p>
            <p className="mt-0.5 text-body-sm font-semibold text-foreground">
              Search, book, drive clean.
            </p>
          </div>
          <Badge variant="outline">Example</Badge>
        </div>

        <div className="relative h-52 overflow-hidden bg-surface-sunken md:h-56">
          <svg
            aria-hidden="true"
            viewBox="0 0 400 240"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full text-border"
          >
            <defs>
              <pattern
                id="lumina-atlas-grid"
                width="28"
                height="28"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 28 0 L 0 0 0 28"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  opacity="0.55"
                />
              </pattern>
            </defs>
            <rect width="400" height="240" fill="url(#lumina-atlas-grid)" />
            <path
              d="M0 178 C 100 148, 246 170, 400 96"
              fill="none"
              className="stroke-border"
              strokeWidth="10"
              opacity="0.35"
            />
            <m.path
              d="M56 166 C 108 152, 148 120, 196 102"
              fill="none"
              className="stroke-brand"
              strokeWidth="3"
              strokeLinecap="round"
              animate={{ opacity: phase >= 0 ? 1 : 0.25 }}
              transition={{ duration: reduce ? 0 : 0.35 }}
            />
            <m.path
              d="M196 102 C 248 84, 294 60, 338 42"
              fill="none"
              className="stroke-brand"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ opacity: 0.15 }}
              animate={{ opacity: phase >= 1 ? 1 : 0.15 }}
              transition={{ duration: reduce ? 0 : 0.35 }}
            />
          </svg>

          <MapStop
            label="You"
            className="left-[14%] top-[69%]"
            active
            reduce={!!reduce}
          />
          <MapStop
            label="Partner"
            className="left-[49%] top-[42%]"
            active={phase >= 1}
            reduce={!!reduce}
          />
          <MapStop
            label="Ready"
            className="left-[84%] top-[18%]"
            active={phase >= 2}
            reduce={!!reduce}
          />
        </div>

        <div className="flex items-start gap-3 border-b border-border p-4 md:px-5">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-subtle text-brand">
            <Icon aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-label font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {current.step}
            </p>
            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={phase}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 1 } : { opacity: 0, y: -6 }}
                transition={{ duration: reduce ? 0 : 0.2 }}
              >
                <p className="mt-0.5 text-body-sm font-semibold text-foreground">
                  {current.title}
                </p>
                <p className="mt-0.5 text-caption text-muted-foreground">
                  {current.detail}
                </p>
              </m.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-border">
          {phases.map((item, index) => {
            const active = phase === index;
            return (
              <div
                key={item.short}
                className="flex items-center gap-2 px-3 py-3 md:px-4"
              >
                <span
                  className={
                    active
                      ? "inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-label font-bold text-brand-foreground"
                      : "inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-border text-label font-bold text-muted-foreground"
                  }
                >
                  {index + 1}
                </span>
                <span
                  className={
                    active
                      ? "text-label font-semibold text-foreground"
                      : "text-label text-muted-foreground"
                  }
                >
                  {item.short}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-caption text-muted-foreground">
        An illustration of the booking flow. Live prices and times appear after
        you search.
      </p>
    </div>
  );
}

function MapStop({
  label,
  className,
  active,
  reduce,
}: {
  label: string;
  className: string;
  active: boolean;
  reduce: boolean;
}) {
  return (
    <div className={`absolute -translate-x-1/2 -translate-y-1/2 ${className}`}>
      <m.div
        initial={false}
        animate={{
          opacity: active ? 1 : 0.45,
          scale: active ? 1 : 0.78,
        }}
        transition={{ duration: reduce ? 0 : 0.3 }}
        className="flex flex-col items-center"
      >
        <span className="relative flex size-4 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-brand/20" />
          <span className="size-2.5 rounded-full bg-brand ring-2 ring-card" />
        </span>
        <span
          className={
            active
              ? "mt-1.5 rounded-sm border border-border bg-card px-1.5 py-0.5 text-label font-semibold leading-none text-foreground shadow-1"
              : "mt-1.5 rounded-sm border border-border bg-card px-1.5 py-0.5 text-label leading-none text-muted-foreground"
          }
        >
          {label}
        </span>
      </m.div>
    </div>
  );
}
