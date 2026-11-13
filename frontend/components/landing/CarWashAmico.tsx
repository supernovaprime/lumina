"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

const PIVOT = "129.5 289.2";
const MAX_ANGLE = 64;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function CarWashAmico({
  svg,
  className,
}: {
  svg: string;
  className?: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    const holder = svgRef.current;
    if (!frame || !holder) return;

    const arm = holder.querySelector<SVGGElement>("#cw-arm");
    const spray = holder.querySelector<SVGGElement>("#cw-spray");
    if (!arm) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;

    const apply = () => {
      raf = 0;

      const rect = frame.getBoundingClientRect();
      const viewport = window.innerHeight;

      const scrollProgress = reduced
        ? 0.62
        : clamp(window.scrollY / (viewport * 0.62), 0, 1);
      const eased = scrollProgress * scrollProgress * (3 - 2 * scrollProgress);

      arm.setAttribute(
        "transform",
        `rotate(${(eased * MAX_ANGLE).toFixed(2)} ${PIVOT})`
      );

      if (spray) {
        const sprayOpacity = smoothstep(0.32, 0.9, eased) * 0.92;
        spray.setAttribute("opacity", sprayOpacity.toFixed(3));
      }

      if (reduced) {
        frame.style.transform = "none";
        return;
      }

      const center = rect.top + rect.height / 2;
      const raw = (viewport / 2 - center) / (viewport / 2 + rect.height / 2);
      const parallax = clamp(raw, -1, 1);

      const x = parallax * -10;
      const y = parallax * 36;
      const rotate = parallax * -2;

      frame.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${rotate.toFixed(2)}deg)`;
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className={cn("relative", className)}>
      <div
        ref={frameRef}
        className="origin-center will-change-transform"
        style={{ transform: "translate3d(0, 0, 0)" }}
      >
        <div
          ref={svgRef}
          className="aspect-square w-full select-none drop-shadow-[0_40px_70px_rgba(4,28,40,0.55)] [&>svg]:h-full [&>svg]:w-full [&>svg]:overflow-visible"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </div>
  );
}
