import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const glassCardBase =
  "relative overflow-hidden rounded-2xl border border-white/55 bg-gradient-to-br from-white/55 via-white/35 to-white/25 backdrop-blur-xl backdrop-saturate-150 shadow-[0_24px_70px_-42px_rgba(4,28,40,0.55),inset_0_1px_0_rgba(255,255,255,0.65)] transition-[border-color,box-shadow,transform] duration-200 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/80 before:to-transparent dark:border-white/[0.12] dark:from-white/[0.09] dark:via-white/[0.05] dark:to-white/[0.025] dark:shadow-[0_30px_80px_-48px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.1)] dark:before:via-white/20";

export function glassCardClass(className?: string) {
  return cn(glassCardBase, className);
}

export function GlassCard({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={glassCardClass(className)} {...props}>
      {children}
    </div>
  );
}
