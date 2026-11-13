import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function SectionFrame({
  id,
  children,
  className,
  tone = "plain",
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  tone?: "plain" | "sunken";
}) {
  return (
    <section
      id={id}
      className={cn(
        "relative scroll-mt-24 border-t border-border/50 px-5 py-20 sm:scroll-mt-28 sm:px-8 sm:py-24 lg:px-12 lg:py-28",
        tone === "sunken" && "bg-surface-sunken/35",
        className
      )}
    >
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className
      )}
    >
      <p
        className={cn(
          "flex items-center gap-2 font-mono text-label font-medium uppercase tracking-[0.18em] text-sea-700 dark:text-sea-300",
          align === "center" && "justify-center"
        )}
      >
        <span
          aria-hidden="true"
          className="inline-block size-1.5 rounded-full bg-sea-400"
        />
        {eyebrow}
      </p>
      <h2 className="mt-4 text-balance font-display text-h2 font-semibold text-foreground">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-pretty text-body-sm text-muted-foreground sm:text-body">
          {description}
        </p>
      ) : null}
    </div>
  );
}
