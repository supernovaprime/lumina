"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

const slides = [
  {
    image: "/assets/Login-amico.svg",
    alt: "Illustration of a person signing in to an account on a large screen",
    eyebrow: "Your wash hub",
    title: "One account. Every wash.",
    body: "Keep your cars, favourite partners, and upcoming bookings together in one calm place.",
  },
  {
    image: "/assets/Secure login-rafiki.svg",
    alt: "Illustration of a person working securely with protected account data",
    eyebrow: "Private by design",
    title: "Your details, locked down.",
    body: "Secure sign-in and thoughtful defaults keep your account and booking details private.",
  },
];

export function AuthArtSlideshow() {
  const [active, setActive] = useState(0);
  const reduceMotion = useReducedMotion();
  const slide = slides[active];

  useEffect(() => {
    if (reduceMotion) return;

    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, 5200);

    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  return (
    <div className="relative flex h-full min-h-[20rem] flex-col overflow-hidden bg-gradient-to-br from-sea-100 via-sky-50 to-sea-200 p-5 sm:min-h-[25rem] sm:p-8 lg:min-h-[38rem] lg:p-10 dark:from-sea-900 dark:via-sea-950 dark:to-sea-900">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-white/60 blur-3xl dark:bg-sea-500/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -left-20 size-72 rounded-full bg-sea-300/40 blur-3xl dark:bg-sky-400/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(rgba(4,28,40,0.16)_1px,transparent_1px)] [background-size:24px_24px] dark:opacity-[0.12] dark:[background-image:radial-gradient(rgba(255,255,255,0.5)_1px,transparent_1px)]"
      />

      <div className="relative z-10 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-sea-900/10 bg-white/55 px-3 py-1.5 font-mono text-label font-medium uppercase tracking-[0.14em] text-sea-800 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-sky-200">
          <ShieldCheck aria-hidden="true" className="size-3.5" />
          Secure account
        </span>
        <span className="font-mono text-label text-sea-800/50 dark:text-sky-300/50">
          0{active + 1} / 0{slides.length}
        </span>
      </div>

      <div className="relative z-10 flex flex-1 flex-col justify-center py-4 sm:py-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active}
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
            transition={
              reduceMotion ? { duration: 0 } : { duration: 0.35, ease: "easeOut" }
            }
            className="flex flex-col"
          >
            <div className="relative mx-auto w-full max-w-[11.5rem] sm:max-w-[22rem] lg:max-w-[20rem]">
              <div
                aria-hidden="true"
                className="absolute inset-x-8 bottom-2 h-10 rounded-full bg-sea-900/20 blur-2xl dark:bg-black/40"
              />
              <div className="relative overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/85 p-2 shadow-[0_28px_70px_-42px_rgba(4,28,40,0.55)] backdrop-blur-sm sm:rounded-[2rem] sm:p-3 dark:border-white/20 dark:bg-white/95 dark:shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)]">
                <Image
                  src={slide.image}
                  alt={slide.alt}
                  width={500}
                  height={500}
                  priority={active === 0}
                  sizes="(min-width: 1024px) 320px, (min-width: 640px) 352px, 80vw"
                  className="h-auto w-full rounded-[1.1rem] object-contain sm:rounded-[1.45rem]"
                />
              </div>
            </div>

            <div className="mx-auto mt-5 max-w-md text-center sm:mt-7 sm:min-h-[8rem]">
              <p className="font-mono text-label font-medium uppercase tracking-[0.16em] text-sea-700 dark:text-sky-300">
                {slide.eyebrow}
              </p>
              <h2 className="mt-2 text-balance font-display text-h3 font-semibold text-sea-950 sm:text-h2 dark:text-paper">
                {slide.title}
              </h2>
              <p className="mt-3 hidden text-pretty text-body-sm text-sea-800/75 sm:block dark:text-sky-200/75">
                {slide.body}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative z-10 flex items-center justify-start gap-4">
        <div
          aria-label="Choose a slide"
          className="flex items-center gap-2"
          role="group"
        >
          {slides.map((item, index) => (
            <button
              key={item.image}
              type="button"
              aria-label={`Show slide ${index + 1}: ${item.title}`}
              aria-pressed={active === index}
              onClick={() => setActive(index)}
              className={cn(
                "h-2 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-sea-50 dark:focus-visible:ring-sea-300/60 dark:focus-visible:ring-offset-sea-950",
                active === index
                  ? "w-8 bg-sea-600 dark:bg-sky-300"
                  : "w-2 bg-sea-900/20 hover:bg-sea-900/40 dark:bg-white/20 dark:hover:bg-white/40"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
