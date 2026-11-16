"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { AdminPagination } from "@/components/dashboard/AdminPagination";
import {
  BookingStatusBadge,
  PaymentStatusBadge,
} from "@/components/dashboard/BookingBadges";
import { BookingCancelDialog } from "@/components/dashboard/BookingCancelDialog";
import {
  endOfDayIso,
  getBookingShortId,
  getCustomerInitials,
  getCustomerName,
  getVehicleLabel,
  isCancellableStatus,
  startOfDayIso,
} from "@/components/dashboard/booking-utils";
import {
  formatUserCount,
  formatUserCurrency,
  formatUserDate,
  formatUserRelativeTime,
} from "@/components/dashboard/user-utils";
import { buttonClass } from "@/components/ui/button";
import { glassCardClass } from "@/components/ui/glass-card";
import {
  ApiError,
  cancelAdminBooking,
  getAdminBooking,
  listAdminBookings,
  type AdminBookingListQuery,
  type AdminBookingSummary,
  type ApiListMeta,
  type BookingStatus,
} from "@/lib/api";
import {
  getCachedBookingDetail,
  getCachedBookingList,
  invalidateAdminBookingCache,
  setCachedBookingDetail,
  setCachedBookingList,
} from "@/lib/admin-booking-cache";
import { clearSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

type LoadState = "loading" | "ready" | "error";

const PAGE_SIZE = 10;

const statusFilters: Array<{
  value: BookingStatus | "";
  label: string;
  icon: typeof CalendarDays;
}> = [
  { value: "", label: "All", icon: CalendarDays },
  { value: "PENDING", label: "Pending", icon: Clock3 },
  { value: "CONFIRMED", label: "Confirmed", icon: CheckCircle2 },
  { value: "IN_PROGRESS", label: "In progress", icon: Loader2 },
  { value: "COMPLETED", label: "Completed", icon: CheckCircle2 },
  { value: "CANCELLED", label: "Cancelled", icon: XCircle },
  { value: "REFUNDED", label: "Refunded", icon: RotateCcw },
];

const emptyMeta: ApiListMeta = {
  page: 1,
  limit: PAGE_SIZE,
  total: 0,
  totalPages: 0,
};

export function BookingsManager() {
  const router = useRouter();
  const requestRef = useRef(0);
  const prefetchedBookingsRef = useRef(new Set<string>());
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<BookingStatus | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [showIds, setShowIds] = useState(false);
  const [page, setPage] = useState(1);
  const [bookings, setBookings] = useState<AdminBookingSummary[]>([]);
  const [meta, setMeta] = useState<ApiListMeta>(emptyMeta);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [cancelTarget, setCancelTarget] =
    useState<AdminBookingSummary | null>(null);
  const [cancelPending, setCancelPending] = useState(false);

  const handleAuthFailure = useCallback(
    (err: unknown) => {
      if (
        !(err instanceof ApiError) ||
        (err.status !== 401 && err.status !== 403)
      ) {
        return false;
      }

      clearSession();
      toast.error(
        err.status === 401 ? "Session expired" : "Admin access required",
        {
          description:
            err.status === 401
              ? "Please sign in again to manage bookings."
              : "Your account no longer has admin access.",
        }
      );
      router.replace("/login");
      return true;
    },
    [router]
  );

  const load = useCallback(
    async (force = false) => {
      const requestId = requestRef.current + 1;
      requestRef.current = requestId;

      const query: AdminBookingListQuery = {
        date: date || undefined,
        status: status || undefined,
        businessId: businessId.trim() || undefined,
        customerId: customerId.trim() || undefined,
        from: startOfDayIso(from),
        to: endOfDayIso(to),
        page,
        limit: PAGE_SIZE,
      };

      const cached = force ? null : getCachedBookingList(query);

      if (cached) {
        setBookings(cached.data);
        setMeta(cached.meta);
        setUpdatedAt(new Date(cached.cachedAt));
        setError("");
        setState(cached.fresh ? "ready" : "loading");

        if (cached.fresh) return;
      } else {
        setState("loading");
        setError("");
      }

      try {
        const result = await listAdminBookings(query);
        if (requestRef.current !== requestId) return;

        const nextMeta = result.meta ?? emptyMeta;
        setBookings(result.data);
        setMeta(nextMeta);
        setUpdatedAt(new Date());
        setState("ready");
        setCachedBookingList(query, result.data, nextMeta);
      } catch (err) {
        if (requestRef.current !== requestId) return;
        if (handleAuthFailure(err)) return;

        setError(
          err instanceof ApiError
            ? err.message
            : "We couldn't load the booking ledger."
        );
        setState("error");
      }
    },
    [businessId, customerId, date, from, handleAuthFailure, page, status, to]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (state !== "ready") return;
    if (meta.totalPages === 0 && page !== 1) {
      setPage(1);
    } else if (meta.totalPages > 0 && page > meta.totalPages) {
      setPage(meta.totalPages);
    }
  }, [meta.totalPages, page, state]);

  const pendingPaymentsOnPage = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          booking.payment?.status === "PENDING" ||
          booking.payment?.status === "PROCESSING"
      ).length,
    [bookings]
  );

  const cancelledOnPage = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          booking.status === "CANCELLED" || booking.status === "REFUNDED"
      ).length,
    [bookings]
  );

  const hasFilters = Boolean(
    date || status || from || to || businessId || customerId
  );
  const showSkeleton = state === "loading" && bookings.length === 0;
  const isUpdating = state === "loading" && bookings.length > 0;
  const start = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const end = Math.min(meta.page * meta.limit, meta.total);

  function clearFilters() {
    setDate("");
    setStatus("");
    setFrom("");
    setTo("");
    setBusinessId("");
    setCustomerId("");
    setPage(1);
  }

  function prefetchBooking(id: string) {
    if (
      prefetchedBookingsRef.current.has(id) ||
      getCachedBookingDetail(id)?.fresh
    ) {
      return;
    }

    prefetchedBookingsRef.current.add(id);
    void getAdminBooking(id)
      .then((result) => {
        setCachedBookingDetail(id, result.data);
      })
      .catch(() => {
        prefetchedBookingsRef.current.delete(id);
      });
  }

  async function confirmCancel(reason: string) {
    if (!cancelTarget || cancelPending) return;

    setCancelPending(true);

    try {
      const result = await cancelAdminBooking(cancelTarget.id, reason);

      invalidateAdminBookingCache(cancelTarget.id);
      toast.success("Booking cancelled", {
        description: result.data.message,
      });
      setCancelTarget(null);
      await load(true);
    } catch (err) {
      if (handleAuthFailure(err)) return;

      toast.error("Couldn't cancel the booking", {
        description:
          err instanceof ApiError
            ? err.message
            : "Please try again in a moment.",
      });

      if (
        err instanceof ApiError &&
        (err.status === 404 || err.status === 409)
      ) {
        setCancelTarget(null);
        await load(true);
      }
    } finally {
      setCancelPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <section className={glassCardClass("relative overflow-hidden p-6 sm:p-8")}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-sea-400/20 blur-3xl dark:bg-sea-500/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 left-1/3 size-56 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-400/10"
        />

        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-label font-medium uppercase tracking-[0.18em] text-sea-700 dark:text-sea-300">
                Platform · Booking operations
              </p>
              <span className="rounded-full border border-border/60 bg-surface-raised/70 px-2 py-0.5 font-mono text-[0.62rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:border-white/10 dark:bg-white/[0.04] dark:text-sky-300/75">
                Live ledger
              </span>
            </div>

            <h1 className="mt-2 text-balance bg-gradient-to-r from-sea-800 via-sea-600 to-sea-400 bg-clip-text font-display text-h2 font-semibold text-transparent dark:from-sea-300 dark:via-sky-200 dark:to-white">
              Booking oversight
            </h1>
            <p className="mt-3 max-w-2xl text-pretty text-body-sm text-muted-foreground dark:text-sky-300/75">
              Trace every wash from request to payment, inspect the full
              lifecycle, and step in with an audited cancellation when a
              booking cannot proceed.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-label text-muted-foreground dark:text-sky-400/70">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays
                  aria-hidden="true"
                  className="size-3.5 text-sea-600 dark:text-sea-300"
                />
                Server-backed ledger
              </span>
              <span className="hidden h-3 w-px bg-border/70 dark:bg-white/10 sm:block" />
              <button
                type="button"
                onClick={() => void load(true)}
                disabled={state === "loading"}
                className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors hover:bg-surface hover:text-foreground disabled:opacity-60 dark:hover:bg-white/[0.06]"
              >
                <RefreshCw
                  aria-hidden="true"
                  className={cn(
                    "size-3.5",
                    state === "loading" && "animate-spin"
                  )}
                />
                Refresh ledger
              </button>
              {updatedAt && (
                <span>
                  Updated{" "}
                  {updatedAt.toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border/55 bg-surface-raised/50 p-3 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.035] sm:min-w-[18rem]">
            <div>
              <p className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-sky-400/60">
                Matching
              </p>
              <p className="mt-1 font-display text-xl font-semibold tabular-nums text-foreground">
                {state === "error" && bookings.length === 0
                  ? "—"
                  : formatUserCount(meta.total)}
              </p>
            </div>
            <div>
              <p className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-sky-400/60">
                Unsettled
              </p>
              <p className="mt-1 font-display text-xl font-semibold tabular-nums text-amber-700 dark:text-amber-200">
                {showSkeleton ? "—" : formatUserCount(pendingPaymentsOnPage)}
              </p>
            </div>
            <div>
              <p className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-sky-400/60">
                Cancelled
              </p>
              <p className="mt-1 font-display text-xl font-semibold tabular-nums text-red-700 dark:text-red-200">
                {showSkeleton ? "—" : formatUserCount(cancelledOnPage)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-label="Booking filters"
        className={glassCardClass("p-3 sm:p-4")}
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div
              role="group"
              aria-label="Filter bookings by status"
              className="flex flex-wrap items-center gap-1.5"
            >
              {statusFilters.map((filter) => {
                const Icon = filter.icon;
                const active = status === filter.value;

                return (
                  <button
                    key={filter.value || "all"}
                    type="button"
                    onClick={() => {
                      setStatus(filter.value);
                      setPage(1);
                    }}
                    aria-pressed={active}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500/60 dark:focus-visible:ring-sea-300/60",
                      active
                        ? "border-sea-500/40 bg-sea-500/15 text-sea-800 dark:border-sea-300/30 dark:bg-sea-400/15 dark:text-sea-100"
                        : "border-border/60 bg-surface-raised/40 text-muted-foreground hover:border-sea-500/30 hover:text-foreground dark:border-white/10 dark:bg-white/[0.03] dark:text-sky-300/70 dark:hover:border-sea-300/25 dark:hover:text-paper"
                    )}
                  >
                    <Icon aria-hidden="true" className="size-3.5" />
                    {filter.label}
                  </button>
                );
              })}
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-border/60 bg-surface-raised/40 px-2.5 text-caption font-medium text-muted-foreground transition-colors hover:border-sea-500/30 hover:text-foreground dark:border-white/10 dark:bg-white/[0.03] dark:text-sky-300/70 dark:hover:border-sea-300/25 dark:hover:text-paper"
              >
                <X aria-hidden="true" className="size-3.5" />
                Clear filters
              </button>
            )}
          </div>

          <div className="grid gap-2 border-t border-border/50 pt-3 dark:border-white/10 sm:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_auto] xl:items-end">
            <div>
              <label
                htmlFor="booking-date"
                className="mb-1.5 block font-mono text-[0.58rem] font-medium uppercase tracking-[0.12em] text-muted-foreground dark:text-sky-400/60"
              >
                Wash date
              </label>
              <input
                id="booking-date"
                type="date"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value);
                  setPage(1);
                }}
                className="h-9 w-full rounded-xl border border-border/70 bg-surface-raised/60 px-3 text-caption font-medium text-foreground outline-none transition-[border-color,box-shadow] focus:border-sea-500/60 focus:ring-2 focus:ring-sea-500/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-paper dark:focus:border-sea-300/45 dark:focus:ring-sea-300/15"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor="booking-from"
                  className="mb-1.5 block font-mono text-[0.58rem] font-medium uppercase tracking-[0.12em] text-muted-foreground dark:text-sky-400/60"
                >
                  Created from
                </label>
                <input
                  id="booking-from"
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(event) => {
                    setFrom(event.target.value);
                    setPage(1);
                  }}
                  className="h-9 w-full rounded-xl border border-border/70 bg-surface-raised/60 px-3 text-caption font-medium text-foreground outline-none transition-[border-color,box-shadow] focus:border-sea-500/60 focus:ring-2 focus:ring-sea-500/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-paper dark:focus:border-sea-300/45 dark:focus:ring-sea-300/15"
                />
              </div>
              <div>
                <label
                  htmlFor="booking-to"
                  className="mb-1.5 block font-mono text-[0.58rem] font-medium uppercase tracking-[0.12em] text-muted-foreground dark:text-sky-400/60"
                >
                  Created to
                </label>
                <input
                  id="booking-to"
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(event) => {
                    setTo(event.target.value);
                    setPage(1);
                  }}
                  className="h-9 w-full rounded-xl border border-border/70 bg-surface-raised/60 px-3 text-caption font-medium text-foreground outline-none transition-[border-color,box-shadow] focus:border-sea-500/60 focus:ring-2 focus:ring-sea-500/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-paper dark:focus:border-sea-300/45 dark:focus:ring-sea-300/15"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowIds((current) => !current)}
                aria-expanded={showIds}
                aria-controls="booking-id-filters"
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-caption font-medium transition-colors",
                  showIds || businessId || customerId
                    ? "border-sea-500/35 bg-sea-500/10 text-sea-800 dark:border-sea-300/30 dark:bg-sea-400/10 dark:text-sea-100"
                    : "border-border/70 bg-surface-raised/60 text-muted-foreground hover:border-sea-500/30 hover:text-foreground dark:border-white/10 dark:bg-white/[0.04] dark:text-sky-300/70 dark:hover:border-sea-300/25 dark:hover:text-paper"
                )}
              >
                <SlidersHorizontal aria-hidden="true" className="size-3.5" />
                Partner & customer
                <span className="text-label opacity-70">
                  {businessId || customerId ? "· active" : "IDs"}
                </span>
              </button>
            </div>

            <p className="text-label text-muted-foreground dark:text-sky-400/60 sm:col-span-2 xl:col-span-1 xl:pb-1.5">
              Dates use UTC boundaries
            </p>
          </div>

          {showIds && (
            <div
              id="booking-id-filters"
              className="grid gap-2 rounded-xl border border-border/50 bg-surface-raised/35 p-3 dark:border-white/10 dark:bg-white/[0.025] sm:grid-cols-2"
            >
              <div>
                <label
                  htmlFor="booking-business-id"
                  className="mb-1.5 block font-mono text-[0.58rem] font-medium uppercase tracking-[0.12em] text-muted-foreground dark:text-sky-400/60"
                >
                  Partner ID
                </label>
                <input
                  id="booking-business-id"
                  value={businessId}
                  onChange={(event) => {
                    setBusinessId(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Paste a business UUID"
                  className="h-9 w-full rounded-xl border border-border/70 bg-surface-raised/60 px-3 font-mono text-[0.7rem] text-foreground outline-none transition-[border-color,box-shadow] placeholder:font-sans placeholder:text-caption placeholder:text-muted-foreground/65 focus:border-sea-500/60 focus:ring-2 focus:ring-sea-500/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-paper dark:placeholder:text-sky-400/40 dark:focus:border-sea-300/45 dark:focus:ring-sea-300/15"
                />
              </div>
              <div>
                <label
                  htmlFor="booking-customer-id"
                  className="mb-1.5 block font-mono text-[0.58rem] font-medium uppercase tracking-[0.12em] text-muted-foreground dark:text-sky-400/60"
                >
                  Customer ID
                </label>
                <input
                  id="booking-customer-id"
                  value={customerId}
                  onChange={(event) => {
                    setCustomerId(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Paste a customer UUID"
                  className="h-9 w-full rounded-xl border border-border/70 bg-surface-raised/60 px-3 font-mono text-[0.7rem] text-foreground outline-none transition-[border-color,box-shadow] placeholder:font-sans placeholder:text-caption placeholder:text-muted-foreground/65 focus:border-sea-500/60 focus:ring-2 focus:ring-sea-500/20 dark:border-white/10 dark:bg-white/[0.04] dark:text-paper dark:placeholder:text-sky-400/40 dark:focus:border-sea-300/45 dark:focus:ring-sea-300/15"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {state === "error" && bookings.length > 0 && (
        <div
          className={glassCardClass(
            "flex flex-col gap-3 border-amber-500/30 p-4 dark:border-amber-300/25 sm:flex-row sm:items-center sm:justify-between"
          )}
        >
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300">
              <AlertTriangle aria-hidden="true" className="size-4" />
            </span>
            <div>
              <p className="text-body-sm font-medium text-foreground">
                Booking ledger unavailable
              </p>
              <p className="mt-0.5 text-caption text-muted-foreground dark:text-sky-300/70">
                {error}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void load(true)}
            className={buttonClass({ variant: "outline", size: "sm" })}
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            Try again
          </button>
        </div>
      )}

      <section
        aria-label="Bookings"
        aria-busy={state === "loading"}
        className={glassCardClass("min-h-[22rem] p-0")}
      >
        <div className="flex flex-col gap-2 border-b border-border/55 px-4 py-3 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-title font-semibold text-foreground">
              Bookings
            </h2>
            {isUpdating && (
              <Loader2
                aria-hidden="true"
                className="size-3.5 animate-spin text-sea-600 dark:text-sea-300"
              />
            )}
          </div>
          <p
            className="text-caption text-muted-foreground dark:text-sky-300/70"
            aria-live="polite"
          >
            {showSkeleton
              ? "Loading bookings…"
              : state === "error" && bookings.length === 0
                ? "Ledger unavailable"
                : meta.total === 0
                  ? "No bookings found"
                  : `Showing ${start}–${end} of ${formatUserCount(meta.total)}`}
          </p>
        </div>

        {showSkeleton ? (
          <div className="space-y-2 p-4 sm:p-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-[5rem] animate-pulse rounded-xl bg-muted/55 dark:bg-white/[0.055]"
              />
            ))}
          </div>
        ) : state === "error" && bookings.length === 0 ? (
          <div className="grid min-h-[18rem] place-items-center px-6 py-12 text-center">
            <div className="max-w-sm">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-200">
                <AlertTriangle aria-hidden="true" className="size-5" />
              </span>
              <h3 className="mt-4 font-display text-title font-semibold text-foreground">
                Booking ledger unavailable
              </h3>
              <p className="mt-1.5 text-body-sm text-muted-foreground dark:text-sky-300/70">
                {error}
              </p>
              <button
                type="button"
                onClick={() => void load(true)}
                className={buttonClass({
                  variant: "outline",
                  size: "sm",
                  className: "mt-4",
                })}
              >
                <RefreshCw aria-hidden="true" className="size-4" />
                Try again
              </button>
            </div>
          </div>
        ) : bookings.length === 0 ? (
          <div className="grid min-h-[18rem] place-items-center px-6 py-12 text-center">
            <div className="max-w-sm">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-sea-500/20 bg-sea-500/10 text-sea-700 dark:border-sea-300/20 dark:bg-sea-400/10 dark:text-sea-200">
                <CalendarDays aria-hidden="true" className="size-5" />
              </span>
              <h3 className="mt-4 font-display text-title font-semibold text-foreground">
                {hasFilters ? "No matching bookings" : "No bookings yet"}
              </h3>
              <p className="mt-1.5 text-body-sm text-muted-foreground dark:text-sky-300/70">
                {hasFilters
                  ? "Try a different wash date, status, created range, or clear the partner and customer IDs."
                  : "Bookings will appear here as soon as a customer reserves a wash."}
              </p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className={buttonClass({
                    variant: "outline",
                    size: "sm",
                    className: "mt-4",
                  })}
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className={cn(isUpdating && "opacity-65")}>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[78rem] text-left">
                <caption className="sr-only">
                  Lumina bookings, including customer, partner, schedule,
                  vehicle, payment, status, and management controls
                </caption>
                <thead>
                  <tr className="border-b border-border/55 bg-surface-raised/35 text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground dark:border-white/10 dark:bg-white/[0.025] dark:text-sky-400/60">
                    <th scope="col" className="px-5 py-2.5 font-medium">
                      Booking
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Customer
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Partner & service
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Schedule
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Vehicle
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Payment
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Status
                    </th>
                    <th scope="col" className="px-5 py-2.5 text-right font-medium">
                      Manage
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/45 dark:divide-white/[0.07]">
                  {bookings.map((booking) => (
                    <tr
                      key={booking.id}
                      className="group transition-colors hover:bg-surface-raised/40 dark:hover:bg-white/[0.025]"
                    >
                      <td className="px-5 py-3.5">
                        <p className="font-mono text-caption font-medium text-foreground">
                          #{getBookingShortId(booking.id)}
                        </p>
                        <p
                          className="mt-0.5 text-label text-muted-foreground dark:text-sky-300/65"
                          title={formatUserRelativeTime(booking.createdAt)}
                        >
                          {formatUserDate(booking.createdAt)}
                        </p>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="grid size-8 shrink-0 place-items-center rounded-full border border-sea-500/20 bg-sea-500/10 font-mono text-[0.6rem] font-semibold text-sea-700 dark:border-sea-300/20 dark:bg-sea-400/10 dark:text-sea-100">
                            {getCustomerInitials(booking.customer)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-body-sm font-medium text-foreground">
                              {getCustomerName(booking.customer)}
                            </p>
                            <p className="mt-0.5 truncate text-caption text-muted-foreground dark:text-sky-300/70">
                              {booking.customer.phone ?? "No phone"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[14rem] px-3 py-3.5">
                        <p className="truncate text-caption font-medium text-foreground/90 dark:text-paper/90">
                          {booking.business.name}
                        </p>
                        <p className="mt-0.5 truncate text-caption text-muted-foreground dark:text-sky-300/70">
                          {booking.service.name} · {booking.business.city}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5">
                        <p className="text-caption font-medium text-foreground/90 dark:text-paper/90">
                          {formatUserDate(booking.date)}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-caption text-muted-foreground dark:text-sky-300/70">
                          <Clock3 aria-hidden="true" className="size-3" />
                          {booking.timeSlot}
                        </p>
                      </td>
                      <td className="max-w-[11rem] px-3 py-3.5">
                        <p className="truncate text-caption text-foreground/90 dark:text-paper/90">
                          {getVehicleLabel(booking.vehicle)}
                        </p>
                        <p className="mt-0.5 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted-foreground dark:text-sky-400/60">
                          {booking.vehicle.licensePlate}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5">
                        <p className="text-caption font-medium tabular-nums text-foreground/90 dark:text-paper/90">
                          {formatUserCurrency(booking.totalPrice)}
                        </p>
                        <div className="mt-1">
                          {booking.payment ? (
                            <PaymentStatusBadge
                              status={booking.payment.status}
                            />
                          ) : (
                            <span className="text-label text-muted-foreground dark:text-sky-400/60">
                              No payment
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <BookingStatusBadge status={booking.status} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/bookings/${booking.id}`}
                            onMouseEnter={() => prefetchBooking(booking.id)}
                            onFocus={() => prefetchBooking(booking.id)}
                            className={buttonClass({
                              variant: "ghost",
                              size: "sm",
                              className:
                                "h-8 px-2.5 text-muted-foreground hover:text-foreground",
                            })}
                          >
                            Open
                            <ArrowUpRight
                              aria-hidden="true"
                              className="size-3.5"
                            />
                          </Link>
                          {isCancellableStatus(booking.status) && (
                            <button
                              type="button"
                              onClick={() => setCancelTarget(booking)}
                              title={`Cancel booking #${getBookingShortId(
                                booking.id
                              )}`}
                              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-red-500/20 px-2.5 text-caption font-medium text-red-700 transition-colors hover:border-red-500/35 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500/60 dark:border-red-300/20 dark:text-red-200 dark:hover:border-red-300/35 dark:hover:bg-red-400/10 dark:focus-visible:ring-sea-300/60"
                            >
                              <XCircle
                                aria-hidden="true"
                                className="size-3.5"
                              />
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-border/45 dark:divide-white/[0.07] lg:hidden">
              {bookings.map((booking) => (
                <article key={booking.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full border border-sea-500/20 bg-sea-500/10 font-mono text-[0.62rem] font-semibold text-sea-700 dark:border-sea-300/20 dark:bg-sea-400/10 dark:text-sea-100">
                      {getCustomerInitials(booking.customer)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-body-sm font-medium text-foreground">
                            {getCustomerName(booking.customer)}
                          </p>
                          <p className="mt-0.5 truncate text-caption text-muted-foreground dark:text-sky-300/70">
                            #{getBookingShortId(booking.id)} ·{" "}
                            {booking.business.name}
                          </p>
                        </div>
                        <BookingStatusBadge status={booking.status} />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-surface-raised/40 px-2 py-0.5 text-label text-muted-foreground dark:border-white/10 dark:bg-white/[0.03] dark:text-sky-300/70">
                          <CalendarDays
                            aria-hidden="true"
                            className="size-3"
                          />
                          {formatUserDate(booking.date)}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-surface-raised/40 px-2 py-0.5 text-label text-muted-foreground dark:border-white/10 dark:bg-white/[0.03] dark:text-sky-300/70">
                          <Clock3 aria-hidden="true" className="size-3" />
                          {booking.timeSlot}
                        </span>
                      </div>
                    </div>
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-border/50 bg-surface-raised/35 p-2.5 dark:border-white/10 dark:bg-white/[0.025]">
                    <div>
                      <dt className="font-mono text-[0.56rem] font-medium uppercase tracking-[0.12em] text-muted-foreground dark:text-sky-400/55">
                        Service
                      </dt>
                      <dd className="mt-0.5 truncate text-caption text-muted-foreground dark:text-sky-300/70">
                        {booking.service.name}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-mono text-[0.56rem] font-medium uppercase tracking-[0.12em] text-muted-foreground dark:text-sky-400/55">
                        Vehicle
                      </dt>
                      <dd className="mt-0.5 truncate text-caption text-muted-foreground dark:text-sky-300/70">
                        {getVehicleLabel(booking.vehicle)}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-mono text-[0.56rem] font-medium uppercase tracking-[0.12em] text-muted-foreground dark:text-sky-400/55">
                        Total
                      </dt>
                      <dd className="mt-0.5 text-caption font-medium tabular-nums text-foreground/90 dark:text-paper/90">
                        {formatUserCurrency(booking.totalPrice)}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-mono text-[0.56rem] font-medium uppercase tracking-[0.12em] text-muted-foreground dark:text-sky-400/55">
                        Payment
                      </dt>
                      <dd className="mt-0.5">
                        {booking.payment ? (
                          <PaymentStatusBadge
                            status={booking.payment.status}
                          />
                        ) : (
                          <span className="text-label text-muted-foreground dark:text-sky-400/60">
                            No payment
                          </span>
                        )}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-3 flex items-center gap-2">
                    <Link
                      href={`/admin/bookings/${booking.id}`}
                      onMouseEnter={() => prefetchBooking(booking.id)}
                      onFocus={() => prefetchBooking(booking.id)}
                      className={buttonClass({
                        variant: "outline",
                        size: "sm",
                        className: "flex-1",
                      })}
                    >
                      Open booking
                      <ArrowUpRight aria-hidden="true" className="size-3.5" />
                    </Link>
                    {isCancellableStatus(booking.status) && (
                      <button
                        type="button"
                        onClick={() => setCancelTarget(booking)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-red-500/20 px-3 text-caption font-medium text-red-700 transition-colors hover:border-red-500/35 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500/60 dark:border-red-300/20 dark:text-red-200 dark:hover:border-red-300/35 dark:hover:bg-red-400/10 dark:focus-visible:ring-sea-300/60"
                      >
                        <XCircle aria-hidden="true" className="size-3.5" />
                        Cancel
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        <AdminPagination
          page={page}
          totalPages={meta.totalPages}
          total={meta.total}
          pageSize={PAGE_SIZE}
          loading={state === "loading"}
          itemLabel="bookings"
          onPageChange={setPage}
        />
      </section>

      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-label text-muted-foreground dark:text-sky-400/60">
        <span>
          Source: <code className="font-mono">GET /api/v1/admin/bookings</code>
        </span>
        <span aria-hidden="true">·</span>
        <span>Filters and pagination are server-backed</span>
      </p>

      <BookingCancelDialog
        booking={cancelTarget}
        pending={cancelPending}
        onCancel={() => {
          if (!cancelPending) setCancelTarget(null);
        }}
        onConfirm={(reason) => void confirmCancel(reason)}
      />
    </div>
  );
}
