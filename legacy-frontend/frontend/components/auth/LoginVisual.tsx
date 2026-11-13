import Image from "next/image";
import {
  CalendarCheck2,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

type LoginVisualProps = {
  className?: string;
};

export function LoginVisual({ className }: LoginVisualProps) {
  return (
    <div
      className={cn(
        "relative isolate overflow-hidden bg-navy-950",
        className,
      )}
    >
      <Image
        src="/assets/hero-car.jpg"
        alt="A freshly washed blue car in a detailing bay"
        fill
        priority
        sizes="(min-width: 1024px) 55vw, 100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-navy-950/90 via-teal-950/60 to-teal-800/25" />
      <div className="absolute inset-0 bg-[radial-gradient(90%_80%_at_0%_100%,rgba(10,147,150,0.38),transparent_60%),radial-gradient(80%_80%_at_100%_0%,rgba(238,155,0,0.18),transparent_60%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-300/60 to-transparent" />

      <div className="relative flex h-full flex-col justify-between gap-8 p-6 sm:p-8 lg:p-10 xl:p-12">
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-caption font-medium text-sand-100 backdrop-blur-xl">
          <ShieldCheck aria-hidden="true" className="size-4 text-gold-300" />
          Verified wash partners
        </div>

        <div className="relative hidden min-h-[18rem] flex-1 lg:block">
          <div className="animate-float absolute right-0 top-0 w-56 rounded-2xl border border-white/15 bg-white/10 p-4 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-400/20 text-teal-200">
                <CalendarCheck2 aria-hidden="true" className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-caption font-semibold text-white">
                  Booking confirmed
                </p>
                <p className="truncate text-label text-sand-200/70">
                  Ocean Wash · 9:30 AM
                </p>
              </div>
            </div>
          </div>

          <div className="animate-float-slow absolute left-0 top-32 w-44 rounded-2xl border border-white/15 bg-white/10 p-4 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
            <div className="flex items-center gap-0.5 text-gold-300">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  aria-hidden="true"
                  className="size-3.5 fill-current"
                />
              ))}
            </div>
            <p className="mt-2 font-display text-2xl font-bold leading-none text-white">
              4.9
            </p>
            <p className="mt-1.5 text-label text-sand-200/70">
              1,200+ happy drivers
            </p>
          </div>

          <div className="animate-float absolute bottom-0 right-6 w-48 rounded-2xl border border-white/15 bg-white/10 p-4 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur-2xl [animation-delay:1.5s]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-label text-sand-200/70">Premium wash</span>
              <span className="flex size-8 items-center justify-center rounded-lg bg-gold-400/20 text-gold-300">
                <Wallet aria-hidden="true" className="size-4" />
              </span>
            </div>
            <p className="mt-2 font-display text-xl font-bold leading-none text-white">
              GHS 85
            </p>
            <p className="mt-1.5 flex items-center gap-1 text-label text-sand-200/70">
              <Sparkles aria-hidden="true" className="size-3 text-gold-300" />
              Inside &amp; out
            </p>
          </div>
        </div>

        <div>
          <p className="max-w-sm font-display text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
            Your car deserves a brighter day.
          </p>
          <p className="mt-3 hidden max-w-sm text-caption leading-relaxed text-sand-200/80 sm:block">
            Book trusted washes in Accra, see prices up front, and get back on
            the road shining.
          </p>
          <div className="mt-5 hidden items-center gap-4 text-caption text-sand-200/80 sm:flex">
            <span className="flex items-center gap-1.5">
              <MapPin aria-hidden="true" className="size-4 text-gold-300" />
              Accra, Ghana
            </span>
            <span aria-hidden="true" className="h-3 w-px bg-white/15" />
            <span className="flex items-center gap-1.5">
              <Star
                aria-hidden="true"
                className="size-4 fill-current text-gold-300"
              />
              4.9 average rating
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
