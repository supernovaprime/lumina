"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  CalendarDays,
  Loader2,
  X,
} from "lucide-react";

import { BookingStatusBadge } from "@/components/dashboard/BookingBadges";
import {
  getCustomerName,
  getBookingShortId,
} from "@/components/dashboard/booking-utils";
import { formatUserCurrency } from "@/components/dashboard/user-utils";
import { buttonClass } from "@/components/ui/button";
import { glassCardClass } from "@/components/ui/glass-card";
import type { AdminBookingSummary } from "@/lib/api";

export function BookingCancelDialog({
  booking,
  pending,
  onCancel,
  onConfirm,
}: {
  booking: AdminBookingSummary | null;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef(pending);
  const cancelRef = useRef(onCancel);
  const [reason, setReason] = useState("");

  const open = Boolean(booking);
  const trimmedReason = reason.trim();
  const canConfirm = !pending && trimmedReason.length > 0;
  const requiresRefund =
    booking?.payment?.status === "COMPLETED" ||
    booking?.payment?.status === "PARTIAL_REFUNDED";

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    cancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!pendingRef.current) cancelRef.current();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        "button:not([disabled]), textarea:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex='-1'])"
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
  }, [open]);

  if (!open || !booking) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[80] grid place-items-center bg-sea-950/55 p-4 backdrop-blur-sm"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.18 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onCancel();
      }}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-booking-dialog-title"
        aria-describedby="cancel-booking-dialog-description"
        className={glassCardClass(
          "w-full max-w-lg border-white/30 p-5 shadow-[0_40px_110px_-40px_rgba(0,0,0,0.65)] sm:p-6 dark:border-white/15"
        )}
        initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.22, ease: "easeOut" }}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          aria-label="Close cancellation dialog"
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500/60 disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-paper dark:focus-visible:ring-sea-300/60"
        >
          <X aria-hidden="true" className="size-4" />
        </button>

        <div className="flex items-start gap-3 pr-8">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-red-500/25 bg-red-500/10 text-red-700 dark:border-red-300/25 dark:bg-red-400/10 dark:text-red-200">
            <AlertTriangle aria-hidden="true" className="size-[18px]" />
          </span>

          <div className="min-w-0">
            <h2
              id="cancel-booking-dialog-title"
              className="font-display text-title font-semibold text-foreground"
            >
              Cancel this booking?
            </h2>
            <p
              id="cancel-booking-dialog-description"
              className="mt-1.5 text-body-sm text-muted-foreground dark:text-sky-300/75"
            >
              The booking is cancelled immediately and the time slot is
              released. This action is recorded in the audit trail.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-border/60 bg-surface-raised/55 p-3 dark:border-white/10 dark:bg-white/[0.035]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-body-sm font-medium text-foreground">
                {getCustomerName(booking.customer)}
              </p>
              <p className="mt-0.5 truncate text-caption text-muted-foreground dark:text-sky-300/70">
                {booking.business.name} · {booking.service.name}
              </p>
            </div>
            <BookingStatusBadge status={booking.status} />
          </div>

          <div className="mt-3 grid gap-2 border-t border-border/50 pt-3 text-caption text-muted-foreground dark:border-white/10 dark:text-sky-300/70 sm:grid-cols-2">
            <p className="flex items-center gap-1.5">
              <CalendarDays aria-hidden="true" className="size-3.5" />
              {booking.date} · {booking.timeSlot}
            </p>
            <p className="sm:text-right">
              Booking #{getBookingShortId(booking.id)} ·{" "}
              {formatUserCurrency(booking.totalPrice)}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="cancel-booking-reason"
              className="text-caption font-medium text-foreground"
            >
              Reason for cancellation{" "}
              <span className="text-red-600 dark:text-red-300">*</span>
            </label>
            <span className="text-label tabular-nums text-muted-foreground dark:text-sky-400/60">
              {reason.length}/500
            </span>
          </div>
          <textarea
            id="cancel-booking-reason"
            data-autofocus
            value={reason}
            onChange={(event) => setReason(event.target.value.slice(0, 500))}
            maxLength={500}
            rows={3}
            disabled={pending}
            placeholder="Explain why this booking is being cancelled. The reason is retained with the booking."
            className="mt-2 w-full resize-none rounded-xl border border-border/60 bg-surface-raised/55 px-3 py-2.5 text-body-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-sea-500/40 focus:ring-2 focus:ring-sea-500/15 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.035] dark:text-paper dark:placeholder:text-sky-400/45 dark:focus:border-sea-300/35 dark:focus:ring-sea-300/15"
          />
          <p className="mt-1.5 text-label text-muted-foreground dark:text-sky-400/65">
            {requiresRefund
              ? "A completed payment will be marked REFUNDED. This console does not call Stripe directly."
              : "No completed payment is attached, so only the booking status and slot usage change."}
          </p>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className={buttonClass({
              variant: "outline",
              className: "h-10 px-4 text-body-sm",
            })}
          >
            Keep booking
          </button>
          <button
            type="button"
            onClick={() => canConfirm && onConfirm(trimmedReason)}
            disabled={!canConfirm}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-red-500/25 px-4 text-body-sm font-medium text-red-700 transition-colors hover:border-red-500/40 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500/60 disabled:pointer-events-none disabled:opacity-50 dark:border-red-300/25 dark:text-red-200 dark:hover:border-red-300/40 dark:hover:bg-red-400/10 dark:focus-visible:ring-sea-300/60"
          >
            {pending ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <AlertTriangle aria-hidden="true" className="size-4" />
            )}
            {pending ? "Cancelling…" : "Cancel booking"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
