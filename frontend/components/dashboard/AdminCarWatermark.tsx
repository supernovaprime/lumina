"use client";

import { useEffect, useState, type RefObject } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

type ParkingTarget = {
  x: number;
  y: number;
  width: number;
  startX: number;
};

export function AdminCarWatermark({
  containerRef,
  parkingRef,
}: {
  containerRef: RefObject<Element>;
  parkingRef: RefObject<Element>;
}) {
  const reduceMotion = useReducedMotion();
  const [target, setTarget] = useState<ParkingTarget | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const parking = parkingRef.current;

    if (!container || !parking) return;

    const measure = () => {
      const stage = container.getBoundingClientRect();
      const button = parking.getBoundingClientRect();
      const width = Math.min(Math.max(stage.width * 0.32, 150), 320);
      const height = width * (500 / 750);

      setTarget({
        x: button.right - stage.left + 10,
        y: button.top - stage.top + button.height / 2 - height / 2,
        width,
        startX: stage.width + 72,
      });
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(parking);

    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [containerRef, parkingRef]);

  if (!target) return null;

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-0 z-0 select-none will-change-transform"
      style={{ width: target.width }}
      initial={
        reduceMotion
          ? false
          : { x: target.startX, y: target.y + 12, opacity: 0 }
      }
      animate={{ x: target.x, y: target.y, opacity: 1 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : {
              x: { duration: 2.4, delay: 0.25, ease: [0.16, 1, 0.3, 1] },
              y: { duration: 1.4, delay: 0.25, ease: "easeOut" },
              opacity: { duration: 0.5, delay: 0.1 },
            }
      }
    >
      <Image
        src="/assets/drunk driving-rafiki.svg"
        alt=""
        width={750}
        height={500}
        unoptimized
        draggable={false}
        className="h-auto w-full"
      />
    </motion.div>
  );
}
