import Link from "next/link";
import { Droplets } from "lucide-react";

import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Lumina home"
      className={cn("group inline-flex items-center gap-2.5 focus-visible:outline-none", className)}
    >
      <span className="relative grid size-9 place-items-center rounded-xl bg-gradient-to-br from-orchid-400 via-orchid-500 to-cobalt-500 shadow-[0_0_26px_-6px_rgba(214,31,168,0.65)] transition-transform duration-300 group-hover:-rotate-6">
        <Droplets aria-hidden="true" className="size-[18px] text-white" strokeWidth={2.2} />
        <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-aqua-300 shadow-[0_0_10px_#80f0f0]" />
      </span>
      <span className="font-display text-[1.7rem] font-semibold italic leading-none tracking-tight text-foreground">
        Lumi<span className="text-orchid-500 dark:text-orchid-300">na</span>
      </span>
    </Link>
  );
}
