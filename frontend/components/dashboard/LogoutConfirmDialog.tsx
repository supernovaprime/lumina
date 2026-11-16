"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LogOut, X } from "lucide-react";

import { buttonClass } from "@/components/ui/button";
import { glassCardClass } from "@/components/ui/glass-card";

export function LogoutConfirmDialog({
  open,
  email,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  email: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        "button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex='-1'])"
      );

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    const timer = window.setTimeout(() => {
      panelRef.current
        ?.querySelector<HTMLElement>("[data-autofocus]")
        ?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(timer);
      previousFocus?.focus();
    };
  }, [onCancel, open]);

  if (!open) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[80] grid place-items-center bg-sea-950/55 p-4 backdrop-blur-sm"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.18 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-dialog-title"
        aria-describedby="logout-dialog-description"
        className={glassCardClass(
          "w-full max-w-md border-white/30 p-5 shadow-[0_40px_110px_-40px_rgba(0,0,0,0.65)] sm:p-6 dark:border-white/15"
        )}
        initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.22, ease: "easeOut" }}
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close sign out dialog"
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500/60 dark:hover:bg-white/10 dark:hover:text-paper dark:focus-visible:ring-sea-300/60"
        >
          <X aria-hidden="true" className="size-4" />
        </button>

        <div className="flex items-start gap-3 pr-8">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-sea-500/20 bg-sea-500/10 text-sea-700 dark:border-sea-300/20 dark:bg-sea-400/10 dark:text-sea-200">
            <LogOut aria-hidden="true" className="size-[18px]" />
          </span>
          <div>
            <h2
              id="logout-dialog-title"
              className="font-display text-title font-semibold text-foreground"
            >
              Sign out of Lumina?
            </h2>
            <p
              id="logout-dialog-description"
              className="mt-1.5 text-body-sm text-muted-foreground dark:text-sky-300/75"
            >
              You are signed in as{" "}
              <span className="font-medium text-foreground dark:text-paper">
                {email}
              </span>
              . You will need to sign in again to access the admin console.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            data-autofocus
            onClick={onCancel}
            className={buttonClass({
              variant: "outline",
              size: "default",
              className: "w-full sm:w-auto",
            })}
          >
            Stay signed in
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={buttonClass({
              variant: "gradient",
              size: "default",
              className: "w-full sm:w-auto",
            })}
          >
            <LogOut aria-hidden="true" className="size-4" />
            Sign out
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
