import Link from "next/link";
import { ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";

import { buttonClass } from "@/components/ui/button";

export function CtaBand() {
  return (
    <section className="border-t border-border/50 px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
      <div className="relative mx-auto max-w-6xl rounded-[2rem] border border-white/25 bg-white/10 p-1.5 shadow-[0_30px_90px_-40px_rgba(4,28,40,0.8)] backdrop-blur-2xl dark:border-white/15 dark:bg-white/[0.06]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/20"
        />

        <div className="relative overflow-hidden rounded-[1.6rem] bg-gradient-to-br from-sea-600/90 via-sea-500/80 to-sea-700/90 px-6 py-14 text-center sm:px-12 sm:py-16 lg:px-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full border border-white/15"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 -left-20 size-96 rounded-full border border-white/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_120%_at_50%_-10%,rgba(255,255,255,0.18),transparent_60%)]"
          />

          <div className="relative mx-auto max-w-2xl">
            <p className="flex items-center justify-center gap-2 font-mono text-label font-medium uppercase tracking-[0.18em] text-white/70">
              <Sparkles aria-hidden="true" className="size-3.5 text-sky-300" />
              Ready when you are
            </p>

            <h2 className="mt-4 text-balance font-display text-h1 font-semibold text-white">
              Your car deserves a{" "}
              <em className="font-normal italic text-sea-200">brighter</em>{" "}
              day.
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-pretty text-body-sm text-white/80 sm:text-body">
              Find a trusted wash near you, compare prices, and book a slot in
              under a minute.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                href="/search"
                className={buttonClass({
                  size: "lg",
                  className:
                    "group bg-white text-sea-950 shadow-none hover:bg-paper hover:text-sea-950",
                })}
              >
                Find a wash
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </Link>
              <Link
                href="#contact"
                className={buttonClass({
                  variant: "outline",
                  size: "lg",
                  className:
                    "group border-white/45 text-white hover:border-white/70 hover:bg-white/10",
                })}
              >
                List your wash
                <ArrowUpRight
                  aria-hidden="true"
                  className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </Link>
            </div>

            <p className="mt-5 text-caption text-white/60">
              No app download. No hidden fees.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
