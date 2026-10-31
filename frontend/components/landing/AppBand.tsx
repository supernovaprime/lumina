import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FadeIn } from "@/components/motion/FadeIn";
import { Button } from "@/components/ui/button";

export function AppBand() {
  return (
    <section id="get-started" aria-labelledby="get-started-heading" className="relative isolate scroll-mt-24 overflow-hidden border-b border-transparent py-section">
      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12 xl:px-20">
        <FadeIn>
          <div className="relative isolate overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 px-6 py-12 text-white md:px-16 md:py-16 shadow-[0_32px_80px_-48px_rgba(0,18,25,0.5)] backdrop-blur-2xl dark:border-white/10 dark:from-teal-900/95 dark:via-teal-800/95 dark:to-teal-950/95 dark:shadow-[0_32px_80px_-48px_rgba(0,0,0,0.9)]">
            {/* Decorative gradient orbs */}
            <div
              aria-hidden="true"
              className="absolute -top-24 -right-24 size-64 rounded-full bg-gold-400/20 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-32 -left-32 size-80 rounded-full bg-teal-300/20 blur-3xl"
            />

            {/* Decorative pattern */}
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />

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
              <div className="inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/10 px-4 py-1.5 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-gold-400 animate-pulse" />
                <p className="text-label font-semibold uppercase tracking-[0.1em] text-gold-200">
                  Ready when you are
                </p>
              </div>

              <h2
                id="get-started-heading"
                className="mt-6 font-display text-h1 font-bold tracking-[-0.02em] text-balance leading-tight"
              >
                Your next clean car is{" "}
                <span className="text-gold-300">one search away.</span>
              </h2>

              <p className="mt-4 max-w-xl text-body text-sand-100 leading-relaxed">
                Compare verified partners, see prices and choose a time that
                fits. No account needed to browse.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-4">
                <Button
                  asChild
                  size="lg"
                  className="bg-gold-500 text-navy-950 hover:bg-gold-400 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                >
                  <Link href="/search">
                    Find a wash
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </Button>
                <Link
                  href="#services"
                  className="group inline-flex items-center gap-2 text-body-sm font-medium text-sand-200 underline decoration-sand-200/40 underline-offset-4 transition-all duration-300 hover:text-white hover:decoration-white"
                >
                  Browse services
                  <ArrowRight
                    aria-hidden="true"
                    className="size-3.5 transition-transform duration-300 group-hover:translate-x-1"
                  />
                </Link>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
