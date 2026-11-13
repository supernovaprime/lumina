"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

export type StickyScrollItem = {
  title: string;
  description: string;
  content?: ReactNode;
};

export function StickyScroll({
  content,
  aside,
  renderCard,
  className,
}: {
  content: StickyScrollItem[];
  aside?: ReactNode;
  renderCard?: (
    item: StickyScrollItem,
    index: number,
    active: boolean
  ) => ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [activeCard, setActiveCard] = useState(0);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      const cards = root.querySelectorAll<HTMLElement>("[data-sticky-card]");
      if (!cards.length) return;

      const focusLine = window.innerHeight * 0.42;
      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      cards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const cardFocus = rect.top + rect.height / 2;
        const distance = Math.abs(cardFocus - focusLine);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      setActiveCard(closestIndex);
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        <div className="flex flex-col gap-6 lg:gap-20">
          {content.map((item, index) => {
            const active = activeCard === index;

            return (
              <div
                key={`${item.title}-${index}`}
                data-sticky-card
                className="lg:min-h-[260px]"
              >
                {renderCard ? (
                  renderCard(item, index, active)
                ) : (
                  <motion.div
                    animate={{
                      opacity: active ? 1 : 0.38,
                      y: active ? 0 : 8,
                    }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  >
                    <h2 className="font-display text-h2 font-semibold text-foreground">
                      {item.title}
                    </h2>
                    <p className="mt-3 max-w-md text-body-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </motion.div>
                )}
              </div>
            );
          })}
          <div aria-hidden="true" className="h-0 lg:h-40" />
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-28">
            {aside ?? (
              <div className="relative h-[30rem] overflow-hidden rounded-2xl border border-border/60 bg-surface">
                {content.map((item, index) => (
                  <motion.div
                    key={`${item.title}-aside-${index}`}
                    initial={false}
                    animate={{
                      opacity: activeCard === index ? 1 : 0,
                      y: activeCard === index ? 0 : 12,
                    }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className={cn(
                      "absolute inset-0",
                      activeCard !== index && "pointer-events-none"
                    )}
                  >
                    {item.content}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {aside ? <div className="mt-8 lg:hidden">{aside}</div> : null}
    </div>
  );
}
