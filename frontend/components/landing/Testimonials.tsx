"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";
import { testimonials } from "@/lib/data/testimonials";

export function Testimonials() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const scrollTo = useCallback((i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>("article");
    if (!card) return;
    const gap = 20;
    track.scrollTo({
      left: i * (card.offsetWidth + gap),
      behavior: "smooth",
    });
    setIndex(i);
  }, []);

  const next = useCallback(
    () => scrollTo((index + 1) % testimonials.length),
    [index, scrollTo],
  );
  const prev = useCallback(
    () =>
      scrollTo((index - 1 + testimonials.length) % testimonials.length),
    [index, scrollTo],
  );

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setIndex((i) => {
        const n = (i + 1) % testimonials.length;
        scrollTo(n);
        return n;
      });
    }, 6000);
    return () => clearInterval(t);
  }, [paused, scrollTo]);

  return (
    <section aria-labelledby="testimonials-heading" className="relative">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2
              id="testimonials-heading"
              className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl"
            >
              What Our Customers Say
            </h2>
            <p className="mt-2 text-sm text-muted md:text-base">
              Real people. Real experiences.
            </p>
          </div>
          <div
            role="group"
            aria-label="Testimonial carousel controls"
            className="flex gap-2"
          >
            <button
              type="button"
              onClick={prev}
              aria-label="Previous testimonial"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition hover:border-tertiary hover:text-tertiary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next testimonial"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition hover:border-tertiary hover:text-tertiary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </Reveal>

        <Reveal delayMs={100}>
          <div
            role="region"
            aria-roledescription="carousel"
            aria-label="Customer testimonials"
            ref={trackRef}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            className="mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {testimonials.map((t) => (
              <article
                key={t.name}
                aria-roledescription="slide"
                aria-label={`${t.name}, ${t.role}`}
                className="w-[85%] shrink-0 snap-start rounded-xl bg-background/85 p-6 shadow-sm backdrop-blur-sm sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)]"
              >
                <div className="flex items-center gap-3.5">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy-800 font-display text-sm font-bold text-gold-400"
                  >
                    {t.initials}
                  </span>
                  <span>
                    <span
                      aria-label="Rated 5 out of 5 stars"
                      className="flex gap-0.5 text-gold-600 dark:text-gold-500"
                    >
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star key={s} size={14} fill="currentColor" strokeWidth={0} />
                      ))}
                    </span>
                    <span className="mt-1 block text-sm italic leading-relaxed text-foreground">
                      &ldquo;{t.quote}&rdquo;
                    </span>
                  </span>
                </div>
                <p className="mt-4 font-display text-sm font-bold text-foreground">
                  {t.name}
                </p>
                <p className="text-xs text-muted">{t.role}</p>
              </article>
            ))}
          </div>
          <div className="mt-4 flex justify-center gap-2" aria-hidden="true">
            {testimonials.map((t, i) => (
              <span
                key={t.name}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-6 bg-gold-500" : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
