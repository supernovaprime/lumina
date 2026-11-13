"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

import { BrandMark } from "@/components/brand/BrandMark";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { buttonClass } from "@/components/ui/button";

export function SiteHeader() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const el = barRef.current;
      if (!el) return;
      el.style.setProperty("--header-angle", `${window.scrollY * 0.35}deg`);
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header className="sticky top-2 z-50 mb-2 sm:top-3 sm:mb-3 lg:top-4 lg:mb-4">
      <div className="mx-auto w-full max-w-[var(--container-page)]">
        <div
          ref={barRef}
          className="header-gradient-ring relative flex items-center justify-between gap-3 overflow-hidden rounded-2xl bg-white/50 px-4 py-3 shadow-[0_24px_70px_-42px_rgba(4,28,40,0.55),inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-3xl backdrop-saturate-150 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/80 before:to-transparent dark:bg-sea-950/50 dark:shadow-[0_30px_80px_-48px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.1)] dark:before:via-white/20 sm:rounded-[1.25rem] sm:px-5 sm:py-3.5"
        >
          <div className="relative z-10">
            <BrandMark />
          </div>

          <div className="relative z-10 flex items-center gap-1 sm:gap-2">
            <Link
              href="/login"
              className={buttonClass({
                variant: "gradient",
                size: "sm",
                className: "h-10",
              })}
            >
              Sign in
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
