"use client";

import confetti from "canvas-confetti";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type CanvasHTMLAttributes,
} from "react";

import { cn } from "@/lib/utils";

export type ConfettiRef = {
  fire: (options?: confetti.Options) => void;
  reset: () => void;
} | null;

export interface ConfettiProps
  extends CanvasHTMLAttributes<HTMLCanvasElement> {
  options?: confetti.Options;
  globalOptions?: confetti.GlobalOptions;
}

export const Confetti = forwardRef<ConfettiRef, ConfettiProps>(
  ({ className, options, globalOptions, ...props }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const instanceRef = useRef<ReturnType<typeof confetti.create> | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        fire: (fireOptions) => {
          instanceRef.current?.({ ...options, ...fireOptions });
        },
        reset: () => {
          instanceRef.current?.reset();
        },
      }),
      [options],
    );

    useEffect(() => {
      if (!canvasRef.current) return;

      const instance = confetti.create(canvasRef.current, {
        resize: true,
        useWorker: true,
        ...globalOptions,
      });
      instanceRef.current = instance;

      return () => {
        instance.reset();
        instanceRef.current = null;
      };
    }, [globalOptions]);

    return (
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 size-full",
          className,
        )}
        {...props}
      />
    );
  },
);

Confetti.displayName = "Confetti";
