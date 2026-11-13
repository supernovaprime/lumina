"use client";

import {
  useEffect,
  useRef,
  useState,
  type HTMLProps,
  type ReactNode,
  type RefObject,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

type BeamOptions = {
  left?: string;
  initialY?: number | string;
  translateY?: number | string;
  rotate?: number;
  className?: string;
  duration?: number;
  delay?: number;
  repeatDelay?: number;
};

const beams: BeamOptions[] = [
  { left: "7%", duration: 6.5, repeatDelay: 2, delay: 1.5 },
  {
    left: "19%",
    duration: 4,
    repeatDelay: 4,
    delay: 3.5,
    className: "h-10",
  },
  {
    left: "31%",
    duration: 8,
    repeatDelay: 6,
    delay: 0.5,
    className: "h-16",
  },
  { left: "43%", duration: 5, repeatDelay: 5, delay: 2.5 },
  {
    left: "55%",
    duration: 9,
    repeatDelay: 2,
    delay: 1,
    className: "h-20",
  },
  {
    left: "67%",
    duration: 4.5,
    repeatDelay: 3,
    delay: 4,
    className: "h-12",
  },
  {
    left: "79%",
    duration: 7,
    repeatDelay: 4,
    delay: 2,
    className: "h-8",
  },
  {
    left: "91%",
    duration: 5.5,
    repeatDelay: 2,
    delay: 0.5,
    className: "h-16",
  },
];

export function BackgroundBeamsWithCollision({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  return (
    <div
      ref={parentRef}
      className={cn(
        "relative flex w-full items-center justify-center overflow-hidden",
        className
      )}
    >
      {!reduceMotion &&
        beams.map((beam, index) => (
          <CollisionMechanism
            key={`${beam.left}-${index}`}
            beamOptions={beam}
            containerRef={containerRef}
            parentRef={parentRef}
          />
        ))}

      <div className="relative z-20 w-full">{children}</div>

      <div
        ref={containerRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-px bg-gradient-to-r from-transparent via-sea-900/15 to-transparent dark:via-white/10"
      />
    </div>
  );
}

function CollisionMechanism({
  parentRef,
  containerRef,
  beamOptions = {},
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  parentRef: RefObject<HTMLDivElement | null>;
  beamOptions?: BeamOptions;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [collision, setCollision] = useState<{
    detected: boolean;
    coordinates: { x: number; y: number } | null;
  }>({
    detected: false,
    coordinates: null,
  });
  const [beamKey, setBeamKey] = useState(0);
  const [cycleCollisionDetected, setCycleCollisionDetected] = useState(false);

  useEffect(() => {
    const checkCollision = () => {
      if (
        ref.current &&
        containerRef.current &&
        parentRef.current &&
        !cycleCollisionDetected
      ) {
        const beamRect = ref.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        const parentRect = parentRef.current.getBoundingClientRect();

        if (beamRect.bottom >= containerRect.top) {
          const relativeX =
            beamRect.left - parentRect.left + beamRect.width / 2;
          const relativeY = beamRect.bottom - parentRect.top;

          setCollision({
            detected: true,
            coordinates: {
              x: relativeX,
              y: relativeY,
            },
          });
          setCycleCollisionDetected(true);
        }
      }
    };

    const animationInterval = window.setInterval(checkCollision, 50);

    return () => window.clearInterval(animationInterval);
  }, [cycleCollisionDetected, containerRef, parentRef]);

  useEffect(() => {
    if (!collision.detected || !collision.coordinates) return;

    const hideTimer = window.setTimeout(() => {
      setCollision({ detected: false, coordinates: null });
      setCycleCollisionDetected(false);
    }, 2000);

    const resetTimer = window.setTimeout(() => {
      setBeamKey((current) => current + 1);
    }, 2000);

    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(resetTimer);
    };
  }, [collision]);

  return (
    <>
      <motion.div
        key={beamKey}
        ref={ref}
        aria-hidden="true"
        animate="animate"
        initial={{
          translateY: beamOptions.initialY ?? "-200px",
          rotate: beamOptions.rotate ?? 0,
        }}
        variants={{
          animate: {
            translateY: beamOptions.translateY ?? "1800px",
            rotate: beamOptions.rotate ?? 0,
          },
        }}
        transition={{
          duration: beamOptions.duration ?? 8,
          repeat: Infinity,
          repeatType: "loop",
          ease: "linear",
          delay: beamOptions.delay ?? 0,
          repeatDelay: beamOptions.repeatDelay ?? 0,
        }}
        style={{ left: beamOptions.left ?? "0%" }}
        className={cn(
          "pointer-events-none absolute top-0 z-0 h-14 w-px rounded-full bg-gradient-to-t from-sea-500 via-sky-400 to-transparent shadow-[0_0_14px_rgba(14,180,243,0.35)] dark:from-sky-300 dark:via-sea-300 dark:shadow-[0_0_18px_rgba(125,217,252,0.3)]",
          beamOptions.className
        )}
      />

      <AnimatePresence>
        {collision.detected && collision.coordinates && (
          <Explosion
            key={`${collision.coordinates.x}-${collision.coordinates.y}`}
            style={{
              left: `${collision.coordinates.x}px`,
              top: `${collision.coordinates.y}px`,
              transform: "translate(-50%, -50%)",
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function Explosion(props: HTMLProps<HTMLDivElement>) {
  const spans = Array.from({ length: 20 }, (_, index) => ({
    id: index,
    initialX: 0,
    initialY: 0,
    directionX: Math.floor(Math.random() * 80 - 40),
    directionY: Math.floor(Math.random() * -50 - 10),
  }));

  return (
    <div
      {...props}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute z-10 h-2 w-2",
        props.className
      )}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="absolute -inset-x-10 top-0 m-auto h-2 w-10 rounded-full bg-gradient-to-r from-transparent via-sea-500 to-transparent blur-sm dark:via-sky-300"
      />

      {spans.map((span) => (
        <motion.span
          key={span.id}
          initial={{ x: span.initialX, y: span.initialY, opacity: 1 }}
          animate={{
            x: span.directionX,
            y: span.directionY,
            opacity: 0,
          }}
          transition={{
            duration: Math.random() * 1.5 + 0.5,
            ease: "easeOut",
          }}
          className="absolute h-1 w-1 rounded-full bg-gradient-to-b from-sky-400 to-sea-500 dark:from-sky-300 dark:to-sea-300"
        />
      ))}
    </div>
  );
}
