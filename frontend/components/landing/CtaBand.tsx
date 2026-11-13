import Link from "next/link";
import { ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";

import { buttonClass } from "@/components/ui/button";
import { BackgroundBeamsWithCollision } from "@/components/ui/background-beams-with-collision";

export function CtaBand() {
  return (
    <section className="border-t border-border/50 px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
      <div className="relative mx-auto max-w-6xl rounded-[2rem] border border-sea-900/10 bg-white/55 p-1.5 shadow-[0_30px_90px_-50px_rgba(4,28,40,0.45)] backdrop-blur-2xl dark:border-white/15 dark:bg-white/[0.06] dark:shadow-[0_30px_90px_-40px_rgba(0,0,0,0.8)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/20"
        />

        <BackgroundBeamsWithCollision className="rounded-[1.6rem] bg-gradient-to-br from-white via-sea-50 to-sea-100 px-6 py-14 text-center sm:px-12 sm:py-16 lg:px-16 dark:from-sea-950 dark:via-sea-950 dark:to-sea-900">
          <div className="relative mx-auto max-w-2xl">
            <p className="flex items-center justify-center gap-2 font-mono text-label font-medium uppercase tracking-[0.18em] text-sea-700 dark:text-sea-300">
              <Sparkles
                aria-hidden="true"
                className="size-3.5 text-sea-500 dark:text-sky-300"
              />
              Ready when you are
            </p>

            <h2 className="mt-4 text-balance font-display text-h1 font-semibold text-sea-950 dark:text-paper">
              Your car deserves a{" "}
              <em className="font-normal italic text-sea-600 dark:text-sea-200">
                brighter
              </em>{" "}
              day.
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-pretty text-body-sm text-sea-800/80 sm:text-body dark:text-white/75">
              Find a trusted wash near you, compare prices, and book a slot in
              under a minute.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                href="/search"
                className={buttonClass({
                  size: "lg",
                  className:
                    "group bg-sea-950 text-paper shadow-none hover:bg-sea-900 hover:text-paper dark:bg-white dark:text-sea-950 dark:hover:bg-paper dark:hover:text-sea-950",
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
                    "group border-sea-900/20 text-sea-900 hover:border-sea-900/40 hover:bg-sea-900/5 dark:border-white/30 dark:text-white dark:hover:border-white/60 dark:hover:bg-white/10",
                })}
              >
                List your wash
                <ArrowUpRight
                  aria-hidden="true"
                  className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </Link>
            </div>

            <p className="mt-5 text-caption text-sea-700/60 dark:text-white/55">
              No app download. No hidden fees.
            </p>
          </div>
        </BackgroundBeamsWithCollision>
      </div>
    </section>
  );
}
