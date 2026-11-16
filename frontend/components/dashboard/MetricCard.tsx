import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

import { glassCardClass } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

type MetricTone = "sea" | "sky" | "success" | "warning";

const toneStyles: Record<
  MetricTone,
  { icon: string; tile: string; bar: string }
> = {
  sea: {
    icon: "text-sea-700 dark:text-sea-200",
    tile: "border-sea-500/20 bg-sea-500/10 dark:border-sea-300/20 dark:bg-sea-400/10",
    bar: "from-sea-500 to-sky-400",
  },
  sky: {
    icon: "text-sky-700 dark:text-sky-200",
    tile: "border-sky-500/20 bg-sky-500/10 dark:border-sky-300/20 dark:bg-sky-400/10",
    bar: "from-sky-500 to-sea-400",
  },
  success: {
    icon: "text-success",
    tile: "border-green-700/20 bg-green-700/10 dark:border-green-300/20 dark:bg-green-300/10",
    bar: "from-green-700 to-sea-400 dark:from-green-300 dark:to-sky-400",
  },
  warning: {
    icon: "text-amber-700 dark:text-amber-300",
    tile: "border-amber-600/20 bg-amber-500/10 dark:border-amber-300/25 dark:bg-amber-300/10",
    bar: "from-amber-500 to-sky-400",
  },
};

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "sea",
  href,
  loading = false,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: MetricTone;
  href?: string;
  loading?: boolean;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "grid size-10 place-items-center rounded-xl border",
            toneStyles[tone].tile
          )}
        >
          <Icon
            aria-hidden="true"
            className={cn("size-[18px]", toneStyles[tone].icon)}
          />
        </span>
        {href && (
          <ArrowUpRight
            aria-hidden="true"
            className="size-4 text-muted-foreground/60 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        )}
      </div>

      <div>
        <p className="font-mono text-[0.65rem] font-medium uppercase tracking-[0.16em] text-muted-foreground dark:text-sky-400/70">
          {label}
        </p>
        {loading ? (
          <div className="mt-2 h-8 w-24 animate-pulse rounded-lg bg-muted/80 dark:bg-white/[0.08]" />
        ) : (
          <p className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-foreground tabular-nums">
            {value}
          </p>
        )}
        {hint && (
          <p className="mt-1 text-label text-muted-foreground/80 dark:text-sky-400/60">
            {hint}
          </p>
        )}
      </div>

      <span
        aria-hidden="true"
        className={cn(
          "mt-auto block h-0.5 w-10 rounded-full bg-gradient-to-r",
          toneStyles[tone].bar
        )}
      />
    </>
  );

  const base = glassCardClass(
    "group flex h-full flex-col gap-4 p-5 transition-transform duration-200"
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          base,
          "hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-sea-300/60"
        )}
      >
        {content}
      </Link>
    );
  }

  return <div className={base}>{content}</div>;
}
