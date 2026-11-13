import Link from "next/link";
import { Droplets } from "lucide-react";

import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  tone = "default",
}: {
  className?: string;
  tone?: "default" | "inverse";
}) {
  const inverse = tone === "inverse";

  return (
    <Link
      href="/"
      aria-label="Lumina home"
      className={cn("group inline-flex items-center gap-2.5 focus-visible:outline-none", className)}
    >
      <span className="relative grid size-9 place-items-center rounded-xl bg-gradient-to-br from-sea-400 via-sea-500 to-sky-500 shadow-[0_0_26px_-6px_rgba(14,180,243,0.65)] transition-transform duration-300 group-hover:-rotate-6">
        <Droplets aria-hidden="true" className="size-[18px] text-white" strokeWidth={2.2} />
        <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-sky-300 shadow-[0_0_10px_#7ad4ff]" />
      </span>
      <span
        className={cn(
          "font-display text-[1.7rem] font-semibold italic leading-none tracking-tight",
          inverse ? "text-paper" : "text-foreground"
        )}
      >
        Lumi<span className="text-sea-600 dark:text-sea-300">na</span>
      </span>
    </Link>
  );
}
