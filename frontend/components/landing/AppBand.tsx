import { Apple, Play } from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";

export function AppBand() {
  return (
    <section aria-labelledby="app-heading" className="bg-background">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 md:px-8 md:py-20 lg:grid-cols-[1.2fr_1fr]">
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.22em] text-gold-700 dark:text-gold-400">
            DOWNLOAD OUR APP
          </p>
          <h2
            id="app-heading"
            className="mt-3 font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl"
          >
            Clean Rides, Right at Your Fingertips
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted md:text-base">
            Book, pay and manage your car wash services anytime, anywhere.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <span
              title="Coming soon"
              aria-disabled="true"
              className="inline-flex cursor-not-allowed items-center gap-2.5 rounded-lg border border-border px-4 py-2.5 text-muted"
            >
              <Apple size={22} />
              <span className="text-left leading-tight">
                <span className="block text-[10px] uppercase">Download on the</span>
                <span className="block text-sm font-semibold">App Store</span>
              </span>
            </span>
            <span
              title="Coming soon"
              aria-disabled="true"
              className="inline-flex cursor-not-allowed items-center gap-2.5 rounded-lg border border-border px-4 py-2.5 text-muted"
            >
              <Play size={22} />
              <span className="text-left leading-tight">
                <span className="block text-[10px] uppercase">Get it on</span>
                <span className="block text-sm font-semibold">Google Play</span>
              </span>
            </span>
          </div>
        </Reveal>

        {/* Phone mock: CSS mini-app until store screenshots exist (TODO) */}
        <Reveal delayMs={120} className="hidden justify-center lg:flex">
          <div
            aria-hidden="true"
            className="w-56 rounded-[2rem] border border-border bg-background p-2.5 shadow-xl shadow-navy-950/10"
          >
            <div className="overflow-hidden rounded-[1.6rem] bg-navy-950 px-4 pb-5 pt-6 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/logo.svg" alt="" className="mx-auto h-16 w-16" />
              <p className="mt-2 font-display text-sm font-extrabold text-white">
                Lumi<span className="text-gold-500">na</span>
              </p>
              <div className="mx-auto mt-4 space-y-2">
                <div className="h-2 rounded-full bg-white/10" />
                <div className="h-2 w-3/4 rounded-full bg-white/10" />
              </div>
              <div className="mt-4 rounded-full bg-gold-500 py-2 text-xs font-bold text-navy-950">
                Book Now
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
