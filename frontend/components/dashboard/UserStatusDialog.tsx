"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  Loader2,
  ShieldCheck,
  UserCheck,
  UserX,
  X,
} from "lucide-react";

import { buttonClass } from "@/components/ui/button";
import { glassCardClass } from "@/components/ui/glass-card";
import type { UserRole } from "@/lib/api";
import { getUserRoleLabel } from "@/components/dashboard/user-utils";

export type UserStatusAction = "activate" | "deactivate";

export function UserStatusDialog({
  open,
  action,
  displayName,
  email,
  role,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  action: UserStatusAction;
  displayName: string;
  email: string;
  role: UserRole;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef(pending);
  const cancelRef = useRef(onCancel);
  const [reason, setReason] = useState("");

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    cancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    if (!open) return;
    setReason("");
  }, [action, open]);

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

  if (!open) return null;

  const isDeactivating = action === "deactivate";
  const title = isDeactivating ? "Suspend this account?" : "Restore account access?";
  const confirmLabel = isDeactivating ? "Suspend account" : "Restore access";
  const pendingLabel = isDeactivating ? "Suspending…" : "Restoring…";

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
        aria-labelledby="user-status-dialog-title"
        aria-describedby="user-status-dialog-description"
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
          aria-label="Close account status dialog"
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500/60 disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-paper dark:focus-visible:ring-sea-300/60"
        >
          <X aria-hidden="true" className="size-4" />
        </button>

        <div className="flex items-start gap-3 pr-8">
          <span
            className={
              isDeactivating
                ? "grid size-10 shrink-0 place-items-center rounded-xl border border-red-500/25 bg-red-500/10 text-red-700 dark:border-red-300/25 dark:bg-red-400/10 dark:text-red-200"
                : "grid size-10 shrink-0 place-items-center rounded-xl border border-green-700/25 bg-green-700/10 text-success dark:border-green-300/20 dark:bg-green-300/10"
            }
          >
            {isDeactivating ? (
              <UserX aria-hidden="true" className="size-[18px]" />
            ) : (
              <UserCheck aria-hidden="true" className="size-[18px]" />
            )}
          </span>

          <div className="min-w-0">
            <h2
              id="user-status-dialog-title"
              className="font-display text-title font-semibold text-foreground"
            >
              {title}
            </h2>
            <p
              id="user-status-dialog-description"
              className="mt-1.5 text-body-sm text-muted-foreground dark:text-sky-300/75"
            >
              {isDeactivating
                ? "This is a safety control, not a delete. The account will be suspended and can be restored later."
                : "This account will regain access to Lumina immediately after confirmation."}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-border/60 bg-surface-raised/55 p-3 dark:border-white/10 dark:bg-white/[0.035]">
          <p className="truncate text-body-sm font-medium text-foreground">
            {displayName}
          </p>
          <p className="mt-0.5 truncate text-caption text-muted-foreground dark:text-sky-300/70">
            {email} · {getUserRoleLabel(role)}
          </p>
        </div>

        {isDeactivating && (
          <>
            <ul className="mt-4 space-y-1.5">
              {[
                "All active sessions end immediately.",
                role === "CUSTOMER"
                  ? "Upcoming bookings are cancelled automatically."
                  : null,
                role === "BUSINESS"
                  ? "The owned business listing is deactivated."
                  : null,
                role === "ADMIN" ? "Console access is revoked immediately." : null,
              ]
                .filter((item): item is string => Boolean(item))
                .map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-caption text-muted-foreground dark:text-sky-300/70"
                  >
                    <AlertTriangle
                      aria-hidden="true"
                      className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-300"
                    />
                    {item}
                  </li>
                ))}
            </ul>

            <div className="mt-4">
              <label
                htmlFor="user-deactivation-reason"
                className="text-caption font-medium text-foreground"
              >
                Reason for suspension{" "}
                <span className="font-normal text-muted-foreground dark:text-sky-400/65">
                  (optional)
                </span>
              </label>
              <textarea
                id="user-deactivation-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Add context for the audit trail — e.g. reported policy violation."
                className="mt-1.5 w-full resize-none rounded-xl border border-border/70 bg-surface-raised/60 px-3 py-2.5 text-body-sm text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/60 focus:border-sea-500/60 focus:ring-2 focus:ring-sea-500/20 dark:border-white/10 dark:bg-white/[0.04] dark:placeholder:text-sky-400/40 dark:focus:border-sea-300/45 dark:focus:ring-sea-300/15"
              />
              <p className="mt-1 text-right font-mono text-[0.6rem] text-muted-foreground dark:text-sky-400/55">
                {reason.length}/500
              </p>
            </div>
          </>
        )}

        {!isDeactivating && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-green-700/25 bg-green-700/10 p-3 dark:border-green-300/20 dark:bg-green-300/[0.06]">
            <ShieldCheck
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-success"
            />
            <p className="text-caption text-muted-foreground dark:text-sky-300/70">
              The account will be able to sign in and use the platform again.
              Suspended sessions stay revoked until the user signs in again.
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            data-autofocus
            onClick={onCancel}
            disabled={pending}
            className={buttonClass({
              variant: "outline",
              size: "default",
              className: "w-full sm:w-auto",
            })}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim())}
            disabled={pending}
            className={buttonClass({
              variant: isDeactivating ? "ghost" : "gradient",
              size: "default",
              className: isDeactivating
                ? "w-full bg-red-600 text-white hover:bg-red-500 sm:w-auto"
                : "w-full sm:w-auto",
            })}
          >
            {pending ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : isDeactivating ? (
              <UserX aria-hidden="true" className="size-4" />
            ) : (
              <UserCheck aria-hidden="true" className="size-4" />
            )}
            {pending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
