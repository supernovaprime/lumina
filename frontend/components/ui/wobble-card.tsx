"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

export function WobbleCard({
  children,
  containerClassName,
  className,
}: {
  children: ReactNode;
  containerClassName?: string;
  className?: string;
}) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const { left, top } = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - left) / event.currentTarget.clientWidth - 0.5;
    const y = (event.clientY - top) / event.currentTarget.clientHeight - 0.5;

    setMousePosition({ x, y });
  };

  return (
    <motion.div
      data-wobble-card
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false);
        setMousePosition({ x: 0, y: 0 });
      }}
      style={{
        transform: isHovering
          ? `translate3d(${mousePosition.x * 16}px, ${mousePosition.y * 16}px, 0) rotate3d(${mousePosition.x}, ${mousePosition.y}, 0, 8deg)`
          : "translate3d(0px, 0px, 0px) rotate3d(0, 0, 0, 0deg)",
        transition: "transform 120ms ease-out",
      }}
      className={cn(
        "relative w-full overflow-hidden rounded-2xl",
        containerClassName
      )}
    >
      <motion.div
        style={{
          transform: isHovering
            ? `translate3d(${mousePosition.x * 32}px, ${mousePosition.y * 32}px, 0)`
            : "translate3d(0px, 0px, 0px)",
          transition: "transform 120ms ease-out",
        }}
        className={cn("relative h-full", className)}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
