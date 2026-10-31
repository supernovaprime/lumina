import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FadeIn } from "@/components/motion/FadeIn";
import { Button } from "@/components/ui/button";

export function AppBand() {
  return (
    <section id="get-started" aria-labelledby="get-started-heading" className="py-section">
      <div className="mx-auto max-w-page px-4 md:px-8">
        <FadeIn>
          <div className="relative isolate overflow-hidden rounded-xl border border-lagoon-800 bg-lagoon-900 px-6 py-10 text-white md:px-12 md:py-14">
            <svg
              aria-hidden="true"
              viewBox="0 0 480 240"
              preserveAspectRatio="none"
              className="absolute inset-y-0 right-0 hidden h-full w-1/2 text-white lg:block"
            >
              <path
                d="M20 210 C 120 180, 190 120, 260 118 S 390 70, 460 28"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="5 8"
                opacity="0.18"
              />
              <circle cx="20" cy="210" r="5" fill="currentColor" opacity="0.4" />
              <circle cx="260" cy="118" r="5" fill="currentColor" opacity="0.4" />
              <circle cx="460" cy="28" r="7" fill="var(--color-marigold-400)" />
            </svg>

            <div className="relative max-w-2xl">
              <p className="flex items-center gap-2 text-label font-semibold uppercase tracking-[0.1em] text-marigold-300">
                <span aria-hidden="true" className="h-px w-5 bg-marigold-300" />
                Ready when you are
              </p>

              <h2
                id="get-started-heading"
                className="mt-4 font-display text-h1 font-bold tracking-[-0.02em] text-balance"
              >
                Your next clean car is one search away.
              </h2>

              <p className="mt-4 max-w-xl text-body text-sand-200">
                Compare verified partners, see prices and choose a time that
                fits. No account needed to browse.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-4">
                <Button asChild size="lg">
                  <Link href="/search">
                    Find a wash
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </Button>
                <Link
                  href="#services"
                  className="text-body-sm font-medium text-sand-200 underline decoration-sand-200/40 underline-offset-4 transition-colors hover:text-white hover:decoration-white"
                >
                  Browse services
                </Link>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
