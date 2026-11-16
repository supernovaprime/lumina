"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Car,
  CheckCircle2,
  Clock3,
  CreditCard,
  Mail,
  MessageSquare,
  Phone,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Star,
  Store,
  UserRound,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  BookingStatusBadge,
  PaymentStatusBadge,
} from "@/components/dashboard/BookingBadges";
import { BookingCancelDialog } from "@/components/dashboard/BookingCancelDialog";
import {
  getBookingShortId,
  getCustomerInitials,
  getCustomerName,
  getVehicleLabel,
  isCancellableStatus,
} from "@/components/dashboard/booking-utils";
import {
  formatUserCount,
  formatUserCurrency,
  formatUserDate,
  formatUserDateTime,
} from "@/components/dashboard/user-utils";
import { buttonClass } from "@/components/ui/button";
import { glassCardClass } from "@/components/ui/glass-card";
import {
  ApiError,
  cancelAdminBooking,
  getAdminBooking,
  type AdminBookingDetail,
} from "@/lib/api";
import {
  getCachedBookingDetail,
  invalidateAdminBookingCache,
  setCachedBookingDetail,
} from "@/lib/admin-booking-cache";
import { clearSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

type LoadState = "loading" | "ready" | "error" | "not-found";

const statTone = {
  sea: "border-sea-500/20 bg-sea-500/10 text-sea-700 dark:border-sea-300/20 dark:bg-sea-400/10 dark:text-sea-200",
  sky: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:border-sky-300/20 dark:bg-sky-400/10 dark:text-sky-200",
  success:
    "border-green-700/20 bg-green-700/10 text-success dark:border-green-300/20 dark:bg-green-300/10",
  warning:
    "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-200",
  danger:
    "border-red-500/20 bg-red-500/10 text-red-700 dark:border-red-300/20 dark:bg-red-400/10 dark:text-red-200",
};

function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "—";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder} min`;
  if (remainder === 0) return `${hours} hr`;
  return `${hours} hr ${remainder} min`;
}

function formatPaymentAmount(
  amount: number | string,
  currency: string | null | undefined
): string {
  try {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: currency || "GHS",
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 2,
    }).format(Number(amount));
  } catch {
    return formatUserCurrency(amount);
  }
}

function ProfileStat({
  label,
  value,
  hint,
  icon: Icon,
  tone = "sea",
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone?: keyof typeof statTone;
}) {
  return (
    <div className={glassCardClass("p-4")}>
      <span
        className={cn(
          "grid size-9 place-items-center rounded-xl border",
          statTone[tone]
        )}
      >
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <p className="mt-3 font-mono text-[0.6rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-sky-400/60">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-foreground">
        {value}
      </p>
      <p className="mt-0.5 text-label text-muted-foreground/80 dark:text-sky-400/60">
        {hint}
      </p>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-border/55 bg-surface-raised/60 text-muted-foreground dark:border-white/10 dark:bg-white/[0.04] dark:text-sky-300/70">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0">
        <dt className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-sky-400/60">
          {label}
        </dt>
        <dd className="mt-1 text-caption text-foreground/90 dark:text-paper/90">
          {children}
        </dd>
      </div>
    </div>
  );
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`${rating} out of 5 stars`}
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          aria-hidden="true"
          className={cn(
            "size-3.5",
            index < Math.round(rating)
              ? "fill-amber-400 text-amber-500 dark:fill-amber-300 dark:text-amber-300"
              : "text-muted-foreground/40 dark:text-sky-400/25"
          )}
        />
      ))}
    </span>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-9 w-32 animate-pulse rounded-full bg-muted/55 dark:bg-white/[0.055]" />
      <section className={glassCardClass("p-6 sm:p-8")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="size-16 animate-pulse rounded-2xl bg-muted/60 dark:bg-white/[0.06]" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-7 w-64 max-w-full animate-pulse rounded-lg bg-muted/60 dark:bg-white/[0.06]" />
            <div className="h-4 w-80 max-w-full animate-pulse rounded bg-muted/45 dark:bg-white/[0.045]" />
            <div className="h-5 w-48 animate-pulse rounded-full bg-muted/40 dark:bg-white/[0.04]" />
          </div>
        </div>
        <div className="mt-6 grid gap-2 border-t border-border/50 pt-4 dark:border-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-14 animate-pulse rounded-xl bg-muted/40 dark:bg-white/[0.04]"
            />
          ))}
        </div>
      </section>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className={glassCardClass(
              "h-32 animate-pulse bg-muted/20 dark:bg-white/[0.02]"
            )}
          />
        ))}
      </div>
      <section
        className={glassCardClass(
          "h-72 animate-pulse bg-muted/20 dark:bg-white/[0.02]"
        )}
      />
    </div>
  );
}

export function BookingProfile({ id }: { id: string }) {
  const router = useRouter();
  const requestRef = useRef(0);
  const [booking, setBooking] = useState<AdminBookingDetail | null>(
    () => getCachedBookingDetail(id)?.data ?? null
  );
  const [state, setState] = useState<LoadState>(() =>
    getCachedBookingDetail(id) ? "ready" : "loading"
  );
  const [error, setError] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
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
              ? "Please sign in again to view booking records."
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

      const cached = force ? null : getCachedBookingDetail(id);

      if (cached) {
        setBooking(cached.data);
        setError("");
        setState(cached.fresh ? "ready" : "loading");

        if (cached.fresh) return;
      } else {
        setState("loading");
        setError("");
      }

      try {
        const result = await getAdminBooking(id);
        if (requestRef.current !== requestId) return;

        setBooking(result.data);
        setCachedBookingDetail(id, result.data);
        setState("ready");
      } catch (err) {
        if (requestRef.current !== requestId) return;
        if (handleAuthFailure(err)) return;

        if (err instanceof ApiError && err.status === 404) {
          setBooking(null);
          setError("This booking no longer exists.");
          setState("not-found");
          return;
        }

        setError(
          err instanceof ApiError
            ? err.message
            : "We couldn't load this booking record."
        );
        setState("error");
      }
    },
    [handleAuthFailure, id]
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function confirmCancel(reason: string) {
    if (!booking || cancelPending) return;

    setCancelPending(true);

    try {
      const result = await cancelAdminBooking(booking.id, reason);

      invalidateAdminBookingCache(booking.id);
      toast.success("Booking cancelled", {
        description: result.data.message,
      });
      setCancelOpen(false);
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
        setCancelOpen(false);
        await load(true);
      }
    } finally {
      setCancelPending(false);
    }
  }

  if (state === "loading" && !booking) {
    return <DetailSkeleton />;
  }

  if (!booking) {
    const notFound = state === "not-found";

    return (
      <div className="space-y-3">
        <Link
          href="/admin/bookings"
          className={buttonClass({
            variant: "ghost",
            size: "sm",
            className: "-ml-1 h-9 text-muted-foreground hover:text-foreground",
          })}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to bookings
        </Link>

        <section
          className={glassCardClass(
            "grid min-h-[24rem] place-items-center p-6 text-center sm:p-8"
          )}
        >
          <div className="max-w-md">
            <span
              className={cn(
                "mx-auto grid size-12 place-items-center rounded-2xl border",
                notFound
                  ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-200"
                  : "border-red-500/25 bg-red-500/10 text-red-700 dark:border-red-300/25 dark:bg-red-400/10 dark:text-red-200"
              )}
            >
              {notFound ? (
                <CalendarDays aria-hidden="true" className="size-5" />
              ) : (
                <AlertTriangle aria-hidden="true" className="size-5" />
              )}
            </span>
            <h1 className="mt-4 font-display text-title font-semibold text-foreground">
              {notFound ? "Booking not found" : "Booking record unavailable"}
            </h1>
            <p className="mt-1.5 text-body-sm text-muted-foreground dark:text-sky-300/70">
              {notFound
                ? "The booking may have been removed, or the link is no longer valid."
                : error}
            </p>
            <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
              {!notFound && (
                <button
                  type="button"
                  onClick={() => void load(true)}
                  className={buttonClass({
                    variant: "gradient",
                    size: "default",
                  })}
                >
                  <RefreshCw aria-hidden="true" className="size-4" />
                  Try again
                </button>
              )}
              <Link
                href="/admin/bookings"
                className={buttonClass({
                  variant: "outline",
                  size: "default",
                })}
              >
                <ArrowLeft aria-hidden="true" className="size-4" />
                Back to ledger
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const customerName = getCustomerName(booking.customer);
  const reference = getBookingShortId(booking.id);
  const cancellable = isCancellableStatus(booking.status);
  const paymentAmount = booking.payment
    ? formatPaymentAmount(booking.payment.amount, booking.payment.currency)
    : formatUserCurrency(booking.totalPrice);

  return (
    <div className="space-y-3">
      <Link
        href="/admin/bookings"
        className={buttonClass({
          variant: "ghost",
          size: "sm",
          className: "-ml-1 h-9 text-muted-foreground hover:text-foreground",
        })}
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to bookings
      </Link>

      {state === "error" && (
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
                Booking refresh failed
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

      <section className={glassCardClass("relative overflow-hidden p-6 sm:p-8")}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-sea-400/20 blur-3xl dark:bg-sea-500/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 left-1/3 size-56 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-400/10"
        />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
            <span className="grid size-16 shrink-0 place-items-center rounded-2xl border border-sea-500/20 bg-sea-500/10 font-display text-xl font-semibold text-sea-700 dark:border-sea-300/20 dark:bg-sea-400/10 dark:text-sea-100">
              {getCustomerInitials(booking.customer)}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-label font-medium uppercase tracking-[0.18em] text-sea-700 dark:text-sea-300">
                  Platform · Booking record
                </p>
                <BookingStatusBadge status={booking.status} />
                {booking.payment && (
                  <PaymentStatusBadge status={booking.payment.status} />
                )}
              </div>

              <h1 className="mt-2 text-balance bg-gradient-to-r from-sea-800 via-sea-600 to-sea-400 bg-clip-text font-display text-h2 font-semibold text-transparent dark:from-sea-300 dark:via-sky-200 dark:to-white">
                #{reference} · {customerName}
              </h1>

              <p className="mt-2 max-w-2xl text-pretty text-body-sm text-muted-foreground dark:text-sky-300/75">
                {booking.service.name} with {booking.business.name} on{" "}
                {formatUserDate(booking.date)} at {booking.timeSlot}.
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-caption text-muted-foreground dark:text-sky-300/70">
                <span className="inline-flex items-center gap-1.5">
                  <Store aria-hidden="true" className="size-3.5 shrink-0" />
                  {booking.business.name}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays
                    aria-hidden="true"
                    className="size-3.5 shrink-0"
                  />
                  {formatUserDate(booking.date)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Wallet aria-hidden="true" className="size-3.5 shrink-0" />
                  {formatUserCurrency(booking.totalPrice)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
            {cancellable && (
              <button
                type="button"
                onClick={() => setCancelOpen(true)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-red-500/25 px-4 text-caption font-medium text-red-700 transition-colors hover:border-red-500/40 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500/60 dark:border-red-300/25 dark:text-red-200 dark:hover:border-red-300/40 dark:hover:bg-red-400/10 dark:focus-visible:ring-sea-300/60"
              >
                <XCircle aria-hidden="true" className="size-4" />
                Cancel booking
              </button>
            )}

            <button
              type="button"
              onClick={() => void load(true)}
              disabled={state === "loading"}
              className={buttonClass({
                variant: "outline",
                size: "default",
                className: "h-10",
              })}
            >
              <RefreshCw
                aria-hidden="true"
                className={cn(
                  "size-4",
                  state === "loading" && "animate-spin"
                )}
              />
              Refresh record
            </button>
          </div>
        </div>

        <dl className="relative mt-6 grid gap-3 border-t border-border/50 pt-4 dark:border-white/10 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <dt className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-sky-400/60">
              Booking ID
            </dt>
            <dd
              title={booking.id}
              className="mt-1 truncate font-mono text-caption text-foreground/90 dark:text-paper/90"
            >
              {booking.id}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-sky-400/60">
              Customer
            </dt>
            <dd className="mt-1 flex items-center gap-1.5 text-caption text-foreground/90 dark:text-paper/90">
              <UserRound
                aria-hidden="true"
                className="size-3.5 shrink-0 text-muted-foreground"
              />
              <Link
                href={`/admin/users/${booking.customer.userId}`}
                className="truncate text-sea-700 transition-colors hover:text-sea-900 dark:text-sea-200 dark:hover:text-white"
              >
                {booking.customer.user.email}
              </Link>
              <ArrowUpRight
                aria-hidden="true"
                className="size-3 shrink-0 text-muted-foreground"
              />
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-sky-400/60">
              Partner
            </dt>
            <dd className="mt-1 flex items-center gap-1.5 text-caption text-foreground/90 dark:text-paper/90">
              <Store
                aria-hidden="true"
                className="size-3.5 shrink-0 text-muted-foreground"
              />
              <Link
                href={`/admin/businesses/${booking.businessId}`}
                className="truncate text-sea-700 transition-colors hover:text-sea-900 dark:text-sea-200 dark:hover:text-white"
              >
                {booking.business.name}
              </Link>
              <ArrowUpRight
                aria-hidden="true"
                className="size-3 shrink-0 text-muted-foreground"
              />
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-sky-400/60">
              Placed
            </dt>
            <dd className="mt-1 flex items-center gap-1.5 text-caption text-foreground/90 dark:text-paper/90">
              <Clock3
                aria-hidden="true"
                className="size-3.5 text-muted-foreground"
              />
              {formatUserDateTime(booking.createdAt)}
            </dd>
          </div>
        </dl>
      </section>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <ProfileStat
          label="Booking total"
          value={formatUserCurrency(booking.totalPrice)}
          hint="Quoted service price"
          icon={Wallet}
          tone="sea"
        />
        <ProfileStat
          label="Service time"
          value={formatDuration(booking.service.durationMinutes)}
          hint={booking.service.category}
          icon={Clock3}
          tone="sky"
        />
        <ProfileStat
          label="Payment"
          value={paymentAmount}
          hint={booking.payment ? booking.payment.status : "No payment record"}
          icon={CreditCard}
          tone={booking.payment ? "success" : "warning"}
        />
        <ProfileStat
          label="Review"
          value={booking.review ? `${booking.review.rating}/5` : "None"}
          hint={booking.review?.isHidden ? "Hidden by moderation" : "Customer rating"}
          icon={Star}
          tone={booking.review ? "warning" : "sky"}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="space-y-3">
          <section className={glassCardClass("p-5 sm:p-6")}>
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-sea-500/20 bg-sea-500/10 text-sea-700 dark:border-sea-300/20 dark:bg-sea-400/10 dark:text-sea-200">
                <ReceiptText aria-hidden="true" className="size-[18px]" />
              </span>
              <div>
                <h2 className="font-display text-title font-semibold text-foreground">
                  Booking details
                </h2>
                <p className="mt-1 text-caption text-muted-foreground dark:text-sky-300/70">
                  Customer, partner, service, vehicle, and scheduling context.
                </p>
              </div>
            </div>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <DetailRow icon={UserRound} label="Customer">
                <p className="font-medium text-foreground dark:text-paper">
                  {customerName}
                </p>
                <p className="mt-0.5 text-caption text-muted-foreground dark:text-sky-300/70">
                  {booking.customer.phone ?? "No phone number"}
                </p>
              </DetailRow>
              <DetailRow icon={Mail} label="Customer email">
                <a
                  href={`mailto:${booking.customer.user.email}`}
                  className="break-all text-sea-700 transition-colors hover:text-sea-900 dark:text-sea-200 dark:hover:text-white"
                >
                  {booking.customer.user.email}
                </a>
              </DetailRow>
              <DetailRow icon={Store} label="Partner">
                <p className="font-medium text-foreground dark:text-paper">
                  {booking.business.name}
                </p>
                <p className="mt-0.5 text-caption text-muted-foreground dark:text-sky-300/70">
                  {booking.business.city}
                </p>
              </DetailRow>
              <DetailRow icon={Mail} label="Partner owner">
                <a
                  href={`mailto:${booking.business.owner.email}`}
                  className="break-all text-sea-700 transition-colors hover:text-sea-900 dark:text-sea-200 dark:hover:text-white"
                >
                  {booking.business.owner.email}
                </a>
              </DetailRow>
              <DetailRow icon={CalendarDays} label="Scheduled">
                <p className="font-medium text-foreground dark:text-paper">
                  {formatUserDate(booking.date)}
                </p>
                <p className="mt-0.5 text-caption text-muted-foreground dark:text-sky-300/70">
                  {booking.timeSlot}
                </p>
              </DetailRow>
              <DetailRow icon={Car} label="Vehicle">
                <p className="font-medium text-foreground dark:text-paper">
                  {getVehicleLabel(booking.vehicle)}
                </p>
                <p className="mt-0.5 text-caption text-muted-foreground dark:text-sky-300/70">
                  {booking.vehicle.licensePlate} · {booking.vehicle.year} ·{" "}
                  {booking.vehicle.color ?? "Color not set"}
                </p>
              </DetailRow>
              <div className="sm:col-span-2">
                <DetailRow icon={ReceiptText} label="Service">
                  <p className="font-medium text-foreground dark:text-paper">
                    {booking.service.name}
                  </p>
                  <p className="mt-0.5 text-caption text-muted-foreground dark:text-sky-300/70">
                    {booking.service.category} ·{" "}
                    {formatDuration(booking.service.durationMinutes)} ·{" "}
                    {formatUserCurrency(booking.service.basePrice)} base price
                  </p>
                </DetailRow>
              </div>
            </dl>

            {booking.notes && (
              <div className="mt-5 rounded-xl border border-border/55 bg-surface-raised/45 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-sky-400/60">
                  Customer notes
                </p>
                <p className="mt-1.5 whitespace-pre-wrap text-caption text-foreground/90 dark:text-paper/90">
                  {booking.notes}
                </p>
              </div>
            )}
          </section>

          {booking.status === "CANCELLED" || booking.status === "REFUNDED" ? (
            <section
              className={glassCardClass(
                "border-red-500/25 p-5 dark:border-red-300/20 sm:p-6"
              )}
            >
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-700 dark:border-red-300/20 dark:bg-red-400/10 dark:text-red-200">
                  <AlertTriangle aria-hidden="true" className="size-[18px]" />
                </span>
                <div>
                  <h2 className="font-display text-title font-semibold text-foreground">
                    Cancellation record
                  </h2>
                  <p className="mt-1 text-caption text-muted-foreground dark:text-sky-300/70">
                    The cancellation reason is retained for the audit trail.
                  </p>
                </div>
              </div>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-sky-400/60">
                    Cancelled at
                  </dt>
                  <dd className="mt-1 text-caption text-foreground/90 dark:text-paper/90">
                    {formatUserDateTime(booking.cancelledAt)}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-sky-400/60">
                    Cancelled by
                  </dt>
                  <dd className="mt-1 truncate font-mono text-caption text-foreground/90 dark:text-paper/90">
                    {booking.cancelledBy ?? "Unknown"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-sky-400/60">
                    Reason
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-caption text-foreground/90 dark:text-paper/90">
                    {booking.cancelReason ?? "No reason recorded."}
                  </dd>
                </div>
              </dl>
            </section>
          ) : (
            <section className={glassCardClass("p-5 sm:p-6")}>
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-sea-500/20 bg-sea-500/10 text-sea-700 dark:border-sea-300/20 dark:bg-sea-400/10 dark:text-sea-200">
                  <Clock3 aria-hidden="true" className="size-[18px]" />
                </span>
                <div>
                  <h2 className="font-display text-title font-semibold text-foreground">
                    Lifecycle
                  </h2>
                  <p className="mt-1 text-caption text-muted-foreground dark:text-sky-300/70">
                    The key moments recorded against this booking.
                  </p>
                </div>
              </div>

              <ol className="mt-5 space-y-4">
                <li className="flex gap-3">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-sea-500/25 bg-sea-500/10 text-sea-700 dark:border-sea-300/25 dark:bg-sea-400/10 dark:text-sea-200">
                    <CheckCircle2 aria-hidden="true" className="size-3.5" />
                  </span>
                  <div>
                    <p className="text-caption font-medium text-foreground dark:text-paper">
                      Booking placed
                    </p>
                    <p className="mt-0.5 text-label text-muted-foreground dark:text-sky-300/65">
                      {formatUserDateTime(booking.createdAt)}
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-border/60 bg-surface-raised/60 text-muted-foreground dark:border-white/10 dark:bg-white/[0.04] dark:text-sky-300/70">
                    <CalendarDays aria-hidden="true" className="size-3.5" />
                  </span>
                  <div>
                    <p className="text-caption font-medium text-foreground dark:text-paper">
                      Scheduled wash
                    </p>
                    <p className="mt-0.5 text-label text-muted-foreground dark:text-sky-300/65">
                      {formatUserDate(booking.date)} · {booking.timeSlot}
                    </p>
                  </div>
                </li>
                {booking.payment && (
                  <li className="flex gap-3">
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-border/60 bg-surface-raised/60 text-muted-foreground dark:border-white/10 dark:bg-white/[0.04] dark:text-sky-300/70">
                      <CreditCard aria-hidden="true" className="size-3.5" />
                    </span>
                    <div>
                      <p className="text-caption font-medium text-foreground dark:text-paper">
                        Payment {booking.payment.status.toLowerCase()}
                      </p>
                      <p className="mt-0.5 text-label text-muted-foreground dark:text-sky-300/65">
                        {formatUserDateTime(booking.payment.updatedAt)}
                      </p>
                    </div>
                  </li>
                )}
              </ol>
            </section>
          )}
        </div>

        <div className="space-y-3">
          <section className={glassCardClass("p-5 sm:p-6")}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-sea-500/20 bg-sea-500/10 text-sea-700 dark:border-sea-300/20 dark:bg-sea-400/10 dark:text-sea-200">
                  <CreditCard aria-hidden="true" className="size-[18px]" />
                </span>
                <div>
                  <h2 className="font-display text-title font-semibold text-foreground">
                    Payment
                  </h2>
                  <p className="mt-1 text-caption text-muted-foreground dark:text-sky-300/70">
                    Settlement state for this booking.
                  </p>
                </div>
              </div>
              {booking.payment && (
                <PaymentStatusBadge status={booking.payment.status} />
              )}
            </div>

            {booking.payment ? (
              <dl className="mt-5 space-y-3">
                <div className="flex items-center justify-between gap-3 border-b border-border/45 pb-3 dark:border-white/10">
                  <dt className="text-caption text-muted-foreground dark:text-sky-300/70">
                    Amount
                  </dt>
                  <dd className="font-display text-lg font-semibold tabular-nums text-foreground">
                    {paymentAmount}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-caption text-muted-foreground dark:text-sky-300/70">
                    Method
                  </dt>
                  <dd className="text-caption font-medium text-foreground/90 dark:text-paper/90">
                    {booking.payment.method ?? "Not recorded"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-caption text-muted-foreground dark:text-sky-300/70">
                    Transaction
                  </dt>
                  <dd
                    title={booking.payment.transactionId ?? undefined}
                    className="max-w-[12rem] truncate font-mono text-[0.65rem] text-foreground/90 dark:text-paper/90"
                  >
                    {booking.payment.transactionId ?? "None"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-caption text-muted-foreground dark:text-sky-300/70">
                    Updated
                  </dt>
                  <dd className="text-caption text-foreground/90 dark:text-paper/90">
                    {formatUserDateTime(booking.payment.updatedAt)}
                  </dd>
                </div>
              </dl>
            ) : (
              <div className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-caption text-amber-800 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-200">
                No payment record is attached. Cancelling this booking will not
                change any payment state.
              </div>
            )}

            {booking.payment?.status === "REFUNDED" && (
              <p className="mt-4 flex items-start gap-2 text-label text-muted-foreground dark:text-sky-400/65">
                <RotateCcw
                  aria-hidden="true"
                  className="mt-0.5 size-3.5 shrink-0"
                />
                Marked refunded by the admin cancellation flow. No direct Stripe
                refund call is made by this console.
              </p>
            )}
          </section>

          <section className={glassCardClass("p-5 sm:p-6")}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-200">
                  <Star aria-hidden="true" className="size-[18px]" />
                </span>
                <div>
                  <h2 className="font-display text-title font-semibold text-foreground">
                    Review
                  </h2>
                  <p className="mt-1 text-caption text-muted-foreground dark:text-sky-300/70">
                    Customer feedback attached to this booking.
                  </p>
                </div>
              </div>
              {booking.review?.isHidden && (
                <span className="rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[0.62rem] font-medium text-red-700 dark:border-red-300/25 dark:bg-red-400/10 dark:text-red-200">
                  Hidden
                </span>
              )}
            </div>

            {booking.review ? (
              <div className="mt-5">
                <RatingStars rating={booking.review.rating} />
                <p className="mt-2 whitespace-pre-wrap text-caption text-foreground/90 dark:text-paper/90">
                  {booking.review.comment || "No written comment."}
                </p>
                {booking.review.response && (
                  <div className="mt-3 rounded-xl border border-border/55 bg-surface-raised/45 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="flex items-center gap-1.5 font-mono text-[0.58rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-sky-400/60">
                      <MessageSquare
                        aria-hidden="true"
                        className="size-3.5"
                      />
                      Partner response
                    </p>
                    <p className="mt-1.5 text-caption text-foreground/90 dark:text-paper/90">
                      {booking.review.response}
                    </p>
                  </div>
                )}
                {booking.review.hiddenReason && (
                  <p className="mt-3 text-label text-red-700 dark:text-red-200">
                    Hidden reason: {booking.review.hiddenReason}
                  </p>
                )}
                <p className="mt-3 text-label text-muted-foreground dark:text-sky-400/60">
                  Submitted {formatUserDateTime(booking.review.createdAt)}
                </p>
              </div>
            ) : (
              <p className="mt-5 rounded-xl border border-border/55 bg-surface-raised/35 p-3 text-caption text-muted-foreground dark:border-white/10 dark:bg-white/[0.025] dark:text-sky-300/70">
                No review has been submitted for this booking.
              </p>
            )}
          </section>

          <section className={glassCardClass("p-5 sm:p-6")}>
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-700 dark:border-sky-300/20 dark:bg-sky-400/10 dark:text-sky-200">
                <Phone aria-hidden="true" className="size-[18px]" />
              </span>
              <div>
                <h2 className="font-display text-title font-semibold text-foreground">
                  Quick contact
                </h2>
                <p className="mt-1 text-caption text-muted-foreground dark:text-sky-300/70">
                  Reach the customer or partner about this booking.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={`mailto:${booking.customer.user.email}`}
                className={buttonClass({ variant: "outline", size: "sm" })}
              >
                <Mail aria-hidden="true" className="size-3.5" />
                Email customer
              </a>
              <a
                href={`mailto:${booking.business.owner.email}`}
                className={buttonClass({ variant: "outline", size: "sm" })}
              >
                <Store aria-hidden="true" className="size-3.5" />
                Email partner
              </a>
              {booking.customer.phone && (
                <a
                  href={`tel:${booking.customer.phone}`}
                  className={buttonClass({ variant: "outline", size: "sm" })}
                >
                  <Phone aria-hidden="true" className="size-3.5" />
                  Call customer
                </a>
              )}
            </div>
          </section>
        </div>
      </div>

      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-label text-muted-foreground dark:text-sky-400/60">
        <span>
          Source:{" "}
          <code className="font-mono">GET /api/v1/admin/bookings/:id</code>
        </span>
        <span aria-hidden="true">·</span>
        <span>Cancellation is audited and releases the slot</span>
      </p>

      <BookingCancelDialog
        booking={cancelOpen ? booking : null}
        pending={cancelPending}
        onCancel={() => {
          if (!cancelPending) setCancelOpen(false);
        }}
        onConfirm={(reason) => void confirmCancel(reason)}
      />
    </div>
  );
}
