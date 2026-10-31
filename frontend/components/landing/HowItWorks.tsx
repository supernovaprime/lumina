"use client";

import Image from "next/image";
import {
  CalendarCheck,
  Car,
  ChevronLeft,
  ChevronRight,
  Search,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { FadeIn } from "@/components/motion/FadeIn";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { useState, useEffect, useRef } from "react";

type Step = {
  icon: LucideIcon;
  title: string;
  copy: string;
};

const steps: Step[] = [
  {
    icon: Search,
    title: "Find your wash",
    copy: "Search your area, compare services and see starting prices before you choose a partner.",
  },
  {
    icon: CalendarCheck,
    title: "Pick a slot",
    copy: "Choose a service, date and time that fits your day. No calls, no waiting on hold.",
  },
  {
    icon: Car,
    title: "Get it clean",
    copy: "Your verified partner takes it from there while you get on with your day.",
  },
  {
    icon: Sparkles,
    title: "Leave a review",
    copy: "After the wash, share feedback so the next driver knows what to expect.",
  },
];

export function HowItWorks() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const SLIDE_DURATION = 7000; // 7 seconds
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const goToStep = (index: number) => {
    setCurrentIndex(index);
    setProgress(0);
  };

  const goToPrevious = () => {
    goToStep((currentIndex - 1 + steps.length) % steps.length);
  };

  const goToNext = () => {
    goToStep((currentIndex + 1) % steps.length);
  };

  useEffect(() => {
    let startTime = Date.now();
    let currentProgress = 0;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      currentProgress = (elapsed / SLIDE_DURATION) * 100;

      if (currentProgress >= 100) {
        setCurrentIndex((prev) => (prev + 1) % steps.length);
        startTime = Date.now();
        currentProgress = 0;
      }

      setProgress(currentProgress);
    };

    intervalRef.current = setInterval(tick, 50);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const currentStep = steps[currentIndex];

  return (
    <section
      id="how-it-works"
      aria-labelledby="how-heading"
      className="relative isolate scroll-mt-24 overflow-hidden border-b border-transparent py-section"
    >
      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12 xl:px-20">
        <FadeIn>
          <div className="mb-8 flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-label font-semibold uppercase tracking-[0.1em] text-gold-300">
              <span
                aria-hidden="true"
                className="h-px w-5 bg-gold-300"
              />
              How it works
            </p>
            <p className="font-mono text-caption text-sand-200">
              Four steps
            </p>
          </div>
          <h2
            id="how-heading"
            className="text-h2 font-display font-semibold tracking-tight text-foreground text-pretty"
          >
            Four steps from search to{" "}
            <span className="text-gold-300">shining.</span>
          </h2>
          <p className="mt-3 max-w-2xl text-body text-sand-100">
            Lumina keeps the whole wash day in one place: discovery, prices, times and reviews. No app download required.
          </p>
        </FadeIn>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12 lg:items-stretch">
          <FadeIn delay={0.1} className="order-2 lg:order-1 h-full">
            <div className="h-full overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-r from-white/65 via-white/45 to-white/60 shadow-[0_20px_56px_-32px_rgba(0,18,25,0.4)] backdrop-blur-2xl dark:border-white/10 dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.07] dark:shadow-[0_20px_56px_-32px_rgba(0,0,0,0.8)]">
              <div className="relative aspect-[4/3]">
                <Image
                  src="/assets/hero-car.jpg"
                  alt="A clean car after a wash at a Lumina partner"
                  fill
                  sizes="(max-width: 1024px) 100vw, 46vw"
                  className="object-cover"
                />
              </div>
              <div className="p-4 text-caption text-muted-foreground dark:text-sand-300">
                A clean car, without the phone calls.
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.15} className="order-1 lg:order-2 h-full">
            <div className="h-full overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-r from-white/65 via-white/45 to-white/60 shadow-[0_20px_56px_-32px_rgba(0,18,25,0.4)] backdrop-blur-2xl dark:border-white/10 dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.07] dark:shadow-[0_20px_56px_-32px_rgba(0,0,0,0.8)]">
              <div className="relative flex h-full flex-col">
                {/* Left Arrow Button */}
                <button
                  onClick={goToPrevious}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex size-10 items-center justify-center rounded-full border border-white/60 bg-white/70 text-teal-600 shadow-[0_8px_24px_-16px_rgba(0,18,25,0.4)] backdrop-blur-xl transition-all duration-300 hover:border-teal-600/50 hover:bg-white hover:scale-110 dark:border-white/10 dark:bg-white/[0.06] dark:text-teal-300 dark:hover:border-teal-300/50 dark:hover:bg-white/10"
                  aria-label="Previous step"
                >
                  <ChevronLeft aria-hidden="true" className="size-5" strokeWidth={2} />
                </button>

                {/* Right Arrow Button */}
                <button
                  onClick={goToNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex size-10 items-center justify-center rounded-full border border-white/60 bg-white/70 text-teal-600 shadow-[0_8px_24px_-16px_rgba(0,18,25,0.4)] backdrop-blur-xl transition-all duration-300 hover:border-teal-600/50 hover:bg-white hover:scale-110 dark:border-white/10 dark:bg-white/[0.06] dark:text-teal-300 dark:hover:border-teal-300/50 dark:hover:bg-white/10"
                  aria-label="Next step"
                >
                  <ChevronRight aria-hidden="true" className="size-5" strokeWidth={2} />
                </button>

                {/* Step Indicators */}
                <div className="flex items-center justify-center gap-2 px-5 pt-5 sm:px-6">
                  {steps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToStep(index)}
                      className="h-1.5 rounded-full transition-all duration-300"
                      style={{
                        width: index === currentIndex ? '2.5rem' : '0.625rem',
                        backgroundColor: index === currentIndex
                          ? 'rgba(10, 147, 150, 0.9)'
                          : 'rgba(0, 18, 25, 0.15)',
                      }}
                      aria-label={`Go to step ${index + 1}`}
                    />
                  ))}
                </div>

                <div className="flex-1 flex flex-col items-center justify-center px-5 py-8 sm:px-6 sm:py-10">
                  {/* Large Icon */}
                  <div className="mb-6 inline-flex size-20 items-center justify-center rounded-2xl border border-white/70 bg-gradient-to-br from-white/80 to-white/50 text-teal-600 shadow-[0_12px_32px_-20px_rgba(0,18,25,0.35)] backdrop-blur-xl transition-all duration-300 dark:border-white/10 dark:from-white/[0.1] dark:to-white/[0.05] dark:text-teal-300 dark:shadow-[0_12px_32px_-20px_rgba(0,0,0,0.6)]">
                    <currentStep.icon aria-hidden="true" className="size-10" strokeWidth={1.5} />
                  </div>

                  {/* Step Number */}
                  <span className="mb-3 font-mono text-sm font-medium text-muted-foreground dark:text-sand-300">
                    Step 0{currentIndex + 1}
                  </span>

                  {/* Title */}
                  <h3 className="mb-3 text-center font-display text-2xl font-semibold tracking-tight text-foreground dark:text-sand-50 sm:text-3xl">
                    {currentStep.title}
                  </h3>

                  {/* Copy */}
                  <p className="max-w-sm text-center text-base leading-relaxed text-muted-foreground dark:text-sand-300">
                    {currentStep.copy}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="border-t border-transparent px-5 pb-5 sm:px-6 sm:pb-6">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/40 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-600 via-teal-500 to-gold-500 dark:from-teal-300 dark:via-teal-400 dark:to-gold-400 transition-all duration-100 ease-linear"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground dark:text-sand-300">
                    <span className="font-medium">0{currentIndex + 1} of 0{steps.length}</span>
                    <span className="font-mono">{Math.round(progress)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
