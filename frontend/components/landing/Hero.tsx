import Link from "next/link";
import { ArrowRight, ArrowUpRight, Sparkles, Star } from "lucide-react";

import { CarWashTunnel } from "@/components/landing/CarWashTunnel";
import { buttonClass } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative my-auto grid items-center gap-6 px-5 pb-10 pt-6 sm:px-8 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:gap-4 lg:px-12 lg:pb-12 lg:pt-6 xl:pt-8">
      <div className="relative z-10 max-w-[34rem]">
        <div className="inline-flex items-center gap-2 rounded-full border border-orchid-500/30 bg-orchid-500/10 px-3 py-1.5 text-label font-medium uppercase tracking-[0.18em] text-orchid-600 dark:text-orchid-300">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-aqua-300 opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-aqua-300" />
          </span>
          Car wash, simplified
        </div>

        <h1 className="mt-6 text-balance font-display text-display font-semibold text-foreground">
          A{" "}
          <em className="font-normal italic text-orchid-500 dark:text-orchid-300">
            brighter
          </em>{" "}
          shine,
          <br className="hidden sm:block" /> on your schedule.
        </h1>

        <p className="mt-5 max-w-[30rem] text-pretty text-body text-muted-foreground sm:text-title sm:leading-relaxed">
          Compare trusted car wash partners in Accra, see the price before you
          book, and pick a time that fits your day.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/search"
            className={buttonClass({ size: "lg", className: "group" })}
          >
            Find a wash
            <ArrowRight
              aria-hidden="true"
              className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
          <Link
            href="#how-it-works"
            className={buttonClass({
              variant: "outline",
              size: "lg",
              className: "group",
            })}
          >
            How it works
            <ArrowUpRight
              aria-hidden="true"
              className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2.5 text-caption text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Star
              aria-hidden="true"
              className="size-3.5 fill-orchid-400 text-orchid-400"
            />
            4.9 average rating
          </span>
          <span className="hidden h-3 w-px bg-border sm:block" />
          <span>1,200+ cars detailed</span>
          <span className="hidden h-3 w-px bg-border sm:block" />
          <span className="flex items-center gap-1.5">
            <Sparkles
              aria-hidden="true"
              className="size-3.5 text-aqua-400 dark:text-aqua-300"
            />
            Verified partners
          </span>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-[640px] lg:max-w-none lg:-mr-4 xl:-mr-8">
        <div
          aria-hidden="true"
          className="absolute inset-x-4 top-1/2 -z-10 h-[52%] -translate-y-1/2 rounded-full bg-orchid-500/10 blur-3xl"
        />
        <CarWashTunnel className="h-auto w-full" />
      </div>
    </section>
  );
}
