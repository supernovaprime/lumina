import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import amicoSvg from "@/public/assets/Car wash-amico.svg?raw";
import { CarWashAmico } from "@/components/landing/CarWashAmico";
import { buttonClass } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative my-auto grid items-center gap-6 px-5 pb-10 pt-6 sm:px-8 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:gap-4 lg:px-12 lg:pb-12 lg:pt-6 xl:pt-8">
      <div className="relative z-10 max-w-[34rem]">
        <div className="inline-flex items-center gap-2 rounded-full border border-sea-500/30 bg-sea-500/10 px-3 py-1.5 text-label font-medium uppercase tracking-[0.18em] text-sea-700 dark:text-sea-300">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-sky-300 opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-sky-300" />
          </span>
          Car wash, simplified
        </div>

        <h1 className="mt-6 text-balance font-display text-display font-semibold text-foreground">
          A{" "}
          <em className="font-normal italic text-sea-600 dark:text-sea-300">
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
            className={buttonClass({
              variant: "gradient",
              size: "lg",
              className: "group",
            })}
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
              variant: "gradientOutline",
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
      </div>

      <div className="relative mx-auto w-full max-w-[520px] sm:max-w-[560px] lg:max-w-[600px] lg:-mr-2 xl:-mr-4">
        <div
          aria-hidden="true"
          className="absolute inset-x-12 top-1/2 -z-10 h-[62%] -translate-y-1/2 rounded-full bg-sea-500/15 blur-3xl"
        />
        <CarWashAmico svg={amicoSvg} />
      </div>
    </section>
  );
}
