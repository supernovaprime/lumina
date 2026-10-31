"use client";

import { m, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

type StaggerProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  amount?: number;
};

export function Stagger({
  children,
  className,
  delay = 0,
  amount = 0.1,
}: StaggerProps) {
  const reduce = useReducedMotion();

  return (
    <m.div
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, amount }}
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: reduce ? 0 : 0.07,
            delayChildren: reduce ? 0 : delay,
          },
        },
      }}
      className={cn(className)}
    >
      {children}
    </m.div>
  );
}

type StaggerItemProps = {
  children: React.ReactNode;
  className?: string;
  y?: number;
};

export function StaggerItem({
  children,
  className,
  y = 14,
}: StaggerItemProps) {
  const reduce = useReducedMotion();

  return (
    <m.div
      variants={{
        hidden: reduce ? { opacity: 1, y: 0 } : { opacity: 0, y },
        show: {
          opacity: 1,
          y: 0,
          transition: {
            duration: reduce ? 0 : 0.4,
            ease: [0.22, 1, 0.36, 1],
          },
        },
      }}
      className={cn(className)}
    >
      {children}
    </m.div>
  );
}
