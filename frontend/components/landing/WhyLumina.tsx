import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Check, Star } from "lucide-react";

import { SectionFrame, SectionHeading } from "@/components/landing/SectionFrame";
import { GlassCard, glassCardClass } from "@/components/ui/glass-card";
import { Lens } from "@/components/ui/lens";
import { MorphingText } from "@/components/ui/morphing-text";
import { WobbleCard } from "@/components/ui/wobble-card";
import { cn } from "@/lib/utils";

const noMore = [
  "guesswork.",
  "phone tag.",
  "hidden fees.",
  "wasted trips.",
  "surprises.",
];

const features = [
  {
    title: "Verified partners",
    description:
      "Every partner is vetted for quality, insurance, and customer care.",
  },
  {
    title: "Upfront pricing",
    description:
      "See the full price before you book. No surprises at the bay.",
  },
  {
    title: "Live availability",
    description: "Real slots from real partners, updated as you browse.",
  },
  {
    title: "Secure payments",
    description:
      "Pay in-app, get a receipt, and manage your booking in one place.",
  },
];

export function WhyLumina() {
  return (
    <SectionFrame id="why-lumina">
      <SectionHeading
        eyebrow="Why Lumina"
        title={
          <>
            No haggling. No{" "}
            <MorphingText
              texts={noMore}
              interval={2600}
              label="guesswork."
              className="font-normal italic text-sea-600 dark:text-sea-300"
            />
          </>
        }
        description="We bring the best independent car washes in Accra into one place, so you can choose on quality, price, and time — not on who shouts loudest."
      />

      <div className="mt-10 grid gap-4 lg:grid-cols-12">
        <GlassCard className="p-1.5 hover:border-sea-500/35 lg:col-span-7">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[0.9rem] bg-sea-900">
            <Lens
              zoomFactor={1.8}
              lensSize={170}
              ariaLabel="Zoom into the wash bay photo"
              className="absolute inset-0 z-10 rounded-[0.9rem]"
            >
              <Image
                src="/assets/carwash.jpeg"
                alt="A blue car being washed in a bright wash bay"
                fill
                sizes="(min-width: 1024px) 56vw, 100vw"
                className="object-cover grayscale contrast-110"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-sea-800/60 mix-blend-multiply"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-sea-950 via-sea-900/25 to-sea-500/30"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-sea-950/90 via-sea-950/5 to-transparent"
              />
            </Lens>

            <span className="pointer-events-none absolute left-4 top-4 z-20 rounded-full border border-white/20 bg-sea-950/50 px-3 py-1.5 font-mono text-label uppercase tracking-[0.14em] text-sea-200 backdrop-blur-md">
              The Lumina standard
            </span>

            <div className="pointer-events-none absolute inset-x-4 bottom-4 z-20 flex items-end justify-between gap-4 rounded-2xl border border-white/15 bg-sea-950/45 p-4 backdrop-blur-xl">
              <div>
                <p className="font-display text-3xl font-semibold leading-none text-paper">
                  4.9
                  <span className="ml-1 text-base font-normal text-sky-300">
                    / 5
                  </span>
                </p>
                <div className="mt-2 flex items-center gap-0.5 text-sea-300">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      aria-hidden="true"
                      className="size-3.5 fill-current"
                    />
                  ))}
                </div>
              </div>
              <p className="max-w-[9rem] text-right text-caption leading-snug text-sky-300">
                Average partner rating across Accra
              </p>
            </div>
          </div>
        </GlassCard>

        <div className="flex flex-col gap-4 lg:col-span-5">
          <div
            className="grid flex-1 gap-4 sm:grid-cols-2"
            style={{ perspective: "1000px" }}
          >
            {features.map((feature, index) => (
              <WobbleCard
                key={feature.title}
                containerClassName={glassCardClass(
                  cn(
                    "hover:border-sea-500/35",
                    (index === 0 || index === 3) && "sm:col-span-2"
                  )
                )}
                className="flex h-full flex-col p-5"
              >
                <span className="grid size-5 place-items-center rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-300">
                  <Check aria-hidden="true" className="size-3" strokeWidth={3} />
                </span>
                <h3 className="mt-4 font-display text-h3 font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-caption text-muted-foreground">
                  {feature.description}
                </p>
              </WobbleCard>
            ))}
          </div>

          <Link
            href="#contact"
            className="group inline-flex items-center gap-1.5 text-caption font-medium text-sea-700 transition-colors hover:text-sea-600 dark:text-sea-300 dark:hover:text-sea-200"
          >
            How we vet partners
            <ArrowUpRight
              aria-hidden="true"
              className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </SectionFrame>
  );
}
