"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

export function MorphingText({
  texts,
  className,
  interval = 2800,
  label,
}: {
  texts: string[];
  className?: string;
  interval?: number;
  label?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [inView, setInView] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "120px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      setActiveIndex(0);
      return;
    }

    if (!inView || texts.length < 2) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % texts.length);
    }, interval);

    return () => window.clearInterval(timer);
  }, [inView, interval, reduceMotion, texts.length]);

  return (
    <span
      ref={ref}
      data-morphing-text
      className={cn(
        "relative inline-grid align-baseline overflow-visible",
        className
      )}
    >
      <span className="sr-only">{label ?? texts[0]}</span>

      {texts.map((text, index) => {
        const active = index === activeIndex;

        return (
          <motion.span
            key={text}
            data-morphing-item
            data-active={active}
            aria-hidden="true"
            initial={false}
            animate={{
              opacity: active ? 1 : 0,
              y: active ? 0 : 10,
              scale: active ? 1 : 0.97,
              filter: active ? "blur(0px)" : "blur(7px)",
            }}
            transition={{
              duration: 0.55,
              ease: [0.22, 1, 0.36, 1] as const,
            }}
            className="col-start-1 row-start-1 inline-block origin-left whitespace-nowrap will-change-[transform,opacity,filter]"
          >
            {text}
          </motion.span>
        );
      })}
    </span>
  );
}
