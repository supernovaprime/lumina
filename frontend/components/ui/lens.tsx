"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useMotionTemplate } from "framer-motion";

import { cn } from "@/lib/utils";

interface Position {
  x: number;
  y: number;
}

interface LensProps {
  children: ReactNode;
  zoomFactor?: number;
  lensSize?: number;
  position?: Position;
  defaultPosition?: Position;
  isStatic?: boolean;
  duration?: number;
  lensColor?: string;
  ariaLabel?: string;
  className?: string;
}

export function Lens({
  children,
  zoomFactor = 1.3,
  lensSize = 170,
  isStatic = false,
  position = { x: 0, y: 0 },
  defaultPosition,
  duration = 0.1,
  lensColor = "black",
  ariaLabel = "Zoom Area",
  className,
}: LensProps) {
  if (zoomFactor < 1) {
    throw new Error("zoomFactor must be greater than 1");
  }
  if (lensSize < 0) {
    throw new Error("lensSize must be greater than 0");
  }

  const [isHovering, setIsHovering] = useState(false);
  const [mousePosition, setMousePosition] = useState<Position>(position);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentPosition = useMemo(() => {
    if (isStatic) return position;
    if (defaultPosition && !isHovering) return defaultPosition;
    return mousePosition;
  }, [isStatic, position, defaultPosition, isHovering, mousePosition]);

  const handleMouseMove = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === "Escape") setIsHovering(false);
  }, []);

  const maskImage = useMotionTemplate`radial-gradient(circle ${
    lensSize / 2
  }px at ${currentPosition.x}px ${
    currentPosition.y
  }px, ${lensColor} 100%, transparent 100%)`;

  const lensContent = useMemo(() => {
    const { x, y } = currentPosition;

    return (
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0, scale: 0.58 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration }}
        className="pointer-events-none absolute inset-0"
        style={{
          transformOrigin: `${x}px ${y}px`,
          zIndex: 50,
        }}
      >
        <motion.div
          className="absolute inset-0 overflow-hidden"
          style={{
            maskImage,
            WebkitMaskImage: maskImage,
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              transform: `scale(${zoomFactor})`,
              transformOrigin: `${x}px ${y}px`,
            }}
          >
            {children}
          </div>
        </motion.div>
        <div
          className="absolute rounded-full border border-white/40 bg-[radial-gradient(circle_at_32%_28%,rgba(255,255,255,0.16),transparent_58%)] shadow-[0_18px_40px_rgba(2,20,32,0.45),inset_0_0_24px_rgba(255,255,255,0.12)]"
          style={{
            width: lensSize,
            height: lensSize,
            left: x - lensSize / 2,
            top: y - lensSize / 2,
          }}
        />
      </motion.div>
    );
  }, [currentPosition, lensSize, maskImage, zoomFactor, children, duration]);

  return (
    <div
      ref={containerRef}
      data-lens
      className={cn(
        "relative z-20 cursor-zoom-in overflow-hidden rounded-xl outline-none",
        "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sea-300/70",
        className
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={handleMouseMove}
      onKeyDown={handleKeyDown}
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
    >
      {children}
      {isStatic || defaultPosition ? (
        lensContent
      ) : (
        <AnimatePresence mode="popLayout">
          {isHovering && lensContent}
        </AnimatePresence>
      )}
    </div>
  );
}
