import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Info,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { buttonClass } from "@/components/ui/button";
import { glassCardClass } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

const methodTone: Record<string, string> = {
  GET: "border-sea-500/25 bg-sea-500/10 text-sea-700 dark:border-sea-300/25 dark:bg-sea-400/10 dark:text-sea-200",
  PUT: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:border-sky-300/25 dark:bg-sky-400/10 dark:text-sky-200",
  PATCH:
    "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-200",
  DELETE:
    "border-red-500/25 bg-red-500/10 text-red-700 dark:border-red-300/25 dark:bg-red-300/10 dark:text-red-200",
};

export type AdminFeaturePageProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  phase: string;
  capabilities: string[];
  method: string;
  endpoint: string;
  params?: string[];
  notes?: string[];
  detailId?: string;
  backHref?: string;
  backLabel?: string;
};

export function AdminFeaturePage({
  eyebrow,
  title,
  description,
  icon: Icon,
  phase,
  capabilities,
  method,
  endpoint,
  params = [],
  notes = [],
  detailId,
  backHref = "/admin",
  backLabel = "Back to dashboard",
}: AdminFeaturePageProps) {
  return (
    <div className="space-y-3">
      <Link
        href={backHref}
        className={buttonClass({
          variant: "ghost",
          size: "sm",
          className: "-ml-1 h-9 text-muted-foreground hover:text-foreground",
        })}
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {backLabel}
      </Link>

      <section
        className={glassCardClass(
          "relative overflow-hidden p-6 sm:p-8"
        )}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-sea-400/20 blur-3xl dark:bg-sea-500/10"
        />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-sea-500/25 bg-sea-500/10 text-sea-700 dark:border-sea-300/25 dark:bg-sea-400/10 dark:text-sea-200">
            <Icon aria-hidden="true" className="size-5" />
          </span>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-label font-medium uppercase tracking-[0.18em] text-sea-700 dark:text-sea-300">
                {eyebrow}
              </p>
              <span className="rounded-full border border-border/60 bg-surface-raised/70 px-2 py-0.5 font-mono text-[0.62rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:border-white/10 dark:bg-white/[0.04] dark:text-sky-300/75">
                {phase}
              </span>
            </div>

            <h1 className="mt-2 text-balance bg-gradient-to-r from-sea-800 via-sea-600 to-sea-400 bg-clip-text font-display text-h2 font-semibold text-transparent dark:from-sea-300 dark:via-sky-200 dark:to-white">
              {title}
            </h1>

            {detailId && (
              <p className="mt-1 font-mono text-label text-muted-foreground dark:text-sky-400/70">
                Record {detailId}
              </p>
            )}

            <p className="mt-3 max-w-2xl text-pretty text-body-sm text-muted-foreground dark:text-sky-300/75">
              {description}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
        <section className={glassCardClass("p-5 sm:p-6")}>
          <h2 className="font-display text-title font-semibold text-foreground">
            Planned capabilities
          </h2>
          <p className="mt-1 text-caption text-muted-foreground dark:text-sky-300/70">
            The interactions this route will own once the feature build begins.
          </p>

          <ul className="mt-4 space-y-2.5">
            {capabilities.map((capability) => (
              <li key={capability} className="flex items-start gap-2.5">
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-sea-600 dark:text-sea-300"
                />
                <span className="text-body-sm text-foreground/90 dark:text-paper/90">
                  {capability}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-3">
          <section className={glassCardClass("p-5 sm:p-6")}>
            <h2 className="font-display text-title font-semibold text-foreground">
              Backend contract
            </h2>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-md border px-2 py-0.5 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.12em]",
                  methodTone[method] ?? methodTone.GET
                )}
              >
                {method}
              </span>
              <code className="min-w-0 break-all rounded-md border border-border/60 bg-surface-sunken/60 px-2 py-0.5 font-mono text-caption text-foreground dark:border-white/10 dark:bg-white/[0.04] dark:text-paper">
                /api/v1{endpoint}
              </code>
            </div>

            <p className="mt-3 inline-flex items-center gap-1.5 text-label text-muted-foreground dark:text-sky-400/70">
              <ShieldCheck aria-hidden="true" className="size-3.5" />
              Requires an active ADMIN session
            </p>

            {params.length > 0 && (
              <div className="mt-4">
                <p className="font-mono text-[0.62rem] font-medium uppercase tracking-[0.16em] text-muted-foreground dark:text-sky-400/60">
                  Query parameters
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {params.map((param) => (
                    <span
                      key={param}
                      className="rounded-md border border-border/60 bg-surface-raised/60 px-2 py-0.5 font-mono text-label text-muted-foreground dark:border-white/10 dark:bg-white/[0.04] dark:text-sky-300/75"
                    >
                      {param}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {notes.length > 0 && (
            <section className={glassCardClass("p-5 sm:p-6")}>
              <h2 className="flex items-center gap-2 font-display text-title font-semibold text-foreground">
                <Info
                  aria-hidden="true"
                  className="size-4 text-sea-600 dark:text-sea-300"
                />
                Build notes
              </h2>
              <ul className="mt-3 space-y-2">
                {notes.map((note) => (
                  <li
                    key={note}
                    className="text-caption text-muted-foreground dark:text-sky-300/70"
                  >
                    {note}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      <p className="px-1 text-label text-muted-foreground dark:text-sky-400/60">
        Scaffold only — this route is registered in the admin navigation and
        reserved for its implementation phase.
      </p>
    </div>
  );
}
