import Link from "next/link";
import { ArrowRight, MapPin, ShieldCheck, Star } from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";
import { VideoButton } from "@/components/landing/VideoButton";

const trustItems = [
  { icon: ShieldCheck, title: "Trusted Businesses", sub: "Verified & reviewed" },
  { icon: Star, title: "Top Rated Services", sub: "Quality you can count on" },
  { icon: MapPin, title: "Convenient Locations", sub: "Near you, always" },
];

export function Hero() {
  return (
    <section className="bg-background">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-14 pt-12 md:px-8 md:pt-16 lg:grid-cols-[1.05fr_1fr] lg:items-center">
        <Reveal>
          <p className="inline-flex items-center gap-1.5 rounded-full border border-gold-600/60 px-4 py-1.5 text-[11px] font-semibold tracking-[0.18em] text-gold-700 dark:border-gold-500/60 dark:text-gold-400">
            PREMIUM CAR WASH SERVICE <ArrowRight size={12} />
          </p>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground md:text-6xl">
            Your Car Deserves
            <span className="block text-gold-600 dark:text-gold-500">The Best Care</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted">
            Book your car wash in minutes. Find trusted car wash businesses
            near you, compare services, and enjoy a cleaner, shinier ride.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <Link
              href="/search"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-fg transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Find a Car Wash <ArrowRight size={16} />
            </Link>
            <VideoButton />
          </div>
          <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-4">
            {trustItems.map((item) => (
              <div key={item.title} className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gold-600/50 text-gold-600 dark:border-gold-500/50 dark:text-gold-400">
                  <item.icon size={17} />
                </span>
                <span>
                  <dt className="text-sm font-semibold text-foreground">
                    {item.title}
                  </dt>
                  <dd className="text-xs text-muted">{item.sub}</dd>
                </span>
              </div>
            ))}
          </dl>
        </Reveal>

        {/* Visual: branded panel until photoshoot assets land (TODO) */}
        <Reveal
          delayMs={120}
          className="relative min-h-[320px] overflow-hidden rounded-3xl border border-border bg-background lg:min-h-[460px] lg:rounded-l-3xl"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_1px_1px,var(--color-border)_1px,transparent_0)] [background-size:22px_22px]"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/logo.svg"
            alt=""
            className="absolute left-1/2 top-1/2 w-3/4 max-w-sm -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_60px_rgba(10,147,150,0.45)]"
          />
          <p
            aria-hidden="true"
            className="absolute bottom-6 right-6 -rotate-6 font-display text-2xl font-semibold italic text-gold-700 drop-shadow-sm dark:text-gold-400 md:text-3xl"
          >
            Clean Today,
            <span className="block underline decoration-gold-500 decoration-2 underline-offset-4">
              Shine Tomorrow
            </span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
