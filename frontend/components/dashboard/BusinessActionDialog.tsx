"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Store,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { buttonClass } from "@/components/ui/button";
import { glassCardClass } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

export type BusinessAction = "approve" | "reject" | "deactivate";

type ActionMeta = {
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel: string;
  icon: LucideIcon;
  iconTone: string;
  reasonLabel: string;
  reasonPlaceholder: string;
  reasonRequired: boolean;
  note: string;
  noteTone: string;
  destructive: boolean;
};

const actionMeta: Record<BusinessAction, ActionMeta> = {
  approve: {
    title: "Approve this partner?",
    description:
      "Approval marks the business as verified, records the reviewer, and notifies the partner by email.",
    confirmLabel: "Approve business",
    pendingLabel: "Approving…",
    icon: CheckCircle2,
    iconTone:
      "border-green-700/25 bg-green-700/10 text-success dark:border-green-300/20 dark:bg-green-300/10",
    reasonLabel: "Approval note",
    reasonPlaceholder: "Optional context for the audit trail.",
    reasonRequired: false,
    note: "The business joins the verified marketplace immediately. It can still be deactivated later.",
    noteTone:
      "border-green-700/25 bg-green-700/10 text-success dark:border-green-300/20 dark:bg-green-300/[0.06]",
    destructive: false,
  },
  reject: {
    title: "Reject this application?",
    description:
      "Rejection records the reason, emails the partner, and keeps the application on file for future review.",
    confirmLabel: "Reject application",
    pendingLabel: "Rejecting…",
    icon: XCircle,
    iconTone:
      "border-red-500/25 bg-red-500/10 text-red-700 dark:border-red-300/25 dark:bg-red-400/10 dark:text-red-200",
    reasonLabel: "Reason for rejection",
    reasonPlaceholder:
      "Explain what the partner needs to fix before they can be approved.",
    reasonRequired: true,
    note: "The partner receives this reason by email. The listing is not removed automatically.",
    noteTone:
      "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-200",
    destructive: true,
  },
  deactivate: {
    title: "Take this business offline?",
    description:
      "Deactivation stops the partner from operating as a live business on the marketplace.",
    confirmLabel: "Deactivate business",
    pendingLabel: "Deactivating…",
    icon: Store,
    iconTone:
      "border-red-500/25 bg-red-500/10 text-red-700 dark:border-red-300/25 dark:bg-red-400/10 dark:text-red-200",
    reasonLabel: "Reason for deactivation",
    reasonPlaceholder: "Optional context for the audit trail.",
    reasonRequired: false,
    note: "Services, bookings, reviews, and the business record are preserved. There is no reactivation control in this console yet.",
    noteTone:
      "border-red-500/25 bg-red-500/10 text-red-700 dark:border-red-300/25 dark:bg-red-400/10 dark:text-red-200",
    destructive: true,
  },
};

export function BusinessActionDialog({
  open,
  action,
  displayName,
  email,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  action: BusinessAction;
  displayName: string;
  email: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef(pending);
  const cancelRef = useRef(onCancel);
  const [reason, setReason] = useState("");

  const meta = actionMeta[action];
  const Icon = meta.icon;
  const NoteIcon = meta.destructive ? AlertTriangle : ShieldCheck;
  const canConfirm =
    !pending && (!meta.reasonRequired || reason.trim().length > 0);

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
        aria-labelledby="business-action-dialog-title"
        aria-describedby="business-action-dialog-description"
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
          aria-label="Close business action dialog"
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500/60 disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-paper dark:focus-visible:ring-sea-300/60"
        >
          <X aria-hidden="true" className="size-4" />
        </button>

        <div className="flex items-start gap-3 pr-8">
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-xl border",
              meta.iconTone
            )}
          >
            <Icon aria-hidden="true" className="size-[18px]" />
          </span>

          <div className="min-w-0">
            <h2
              id="business-action-dialog-title"
              className="font-display text-title font-semibold text-foreground"
            >
              {meta.title}
            </h2>
            <p
              id="business-action-dialog-description"
              className="mt-1.5 text-body-sm text-muted-foreground dark:text-sky-300/75"
            >
              {meta.description}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-border/60 bg-surface-raised/55 p-3 dark:border-white/10 dark:bg-white/[0.035]">
          <p className="truncate text-body-sm font-medium text-foreground">
            {displayName}
          </p>
          <p className="mt-0.5 truncate text-caption text-muted-foreground dark:text-sky-300/70">
            {email}
          </p>
        </div>

        <div className="mt-4">
          <label
            htmlFor="business-action-reason"
            className="text-caption font-medium text-foreground"
          >
            {meta.reasonLabel}{" "}
            <span
              className={cn(
                "font-normal",
                meta.reasonRequired
                  ? "text-red-700 dark:text-red-300"
                  : "text-muted-foreground dark:text-sky-400/65"
              )}
            >
              {meta.reasonRequired ? "(required)" : "(optional)"}
            </span>
          </label>
          <textarea
            id="business-action-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            rows={3}
            data-autofocus={meta.reasonRequired ? "" : undefined}
            aria-required={meta.reasonRequired}
            placeholder={meta.reasonPlaceholder}
            className="mt-1.5 w-full resize-none rounded-xl border border-border/70 bg-surface-raised/60 px-3 py-2.5 text-body-sm text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/60 focus:border-sea-500/60 focus:ring-2 focus:ring-sea-500/20 dark:border-white/10 dark:bg-white/[0.04] dark:placeholder:text-sky-400/40 dark:focus:border-sea-300/45 dark:focus:ring-sea-300/15"
          />
          <p className="mt-1 text-right font-mono text-[0.6rem] text-muted-foreground dark:text-sky-400/55">
            {reason.length}/500
          </p>
          {meta.reasonRequired && reason.trim().length === 0 && (
            <p className="mt-1 text-caption text-red-700 dark:text-red-300">
              A reason is required before this action can be confirmed.
            </p>
          )}
        </div>

        <div
          className={cn(
            "mt-4 flex items-start gap-2 rounded-xl border p-3",
            meta.noteTone
          )}
        >
          <NoteIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p className="text-caption text-muted-foreground dark:text-sky-300/70">
            {meta.note}
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            data-autofocus={meta.reasonRequired ? undefined : ""}
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
            disabled={!canConfirm}
            className={buttonClass({
              variant: meta.destructive ? "ghost" : "gradient",
              size: "default",
              className: meta.destructive
                ? "w-full bg-red-600 text-white hover:bg-red-500 sm:w-auto"
                : "w-full sm:w-auto",
            })}
          >
            {pending ? (
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Icon aria-hidden="true" className="size-4" />
            )}
            {pending ? meta.pendingLabel : meta.confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
