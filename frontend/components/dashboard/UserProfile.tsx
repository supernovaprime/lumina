"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Car,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Heart,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
  Star,
  Store,
  UserCheck,
  UserRound,
  UserX,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  AccountAvatar,
  RoleBadge,
  StatusBadge,
} from "@/components/dashboard/UserBadges";
import {
  UserStatusDialog,
  type UserStatusAction,
} from "@/components/dashboard/UserStatusDialog";
import {
  formatUserCount,
  formatUserCurrency,
  formatUserDate,
  formatUserDateTime,
  formatUserRelativeTime,
  getUserName,
  roleDescriptions,
} from "@/components/dashboard/user-utils";
import { buttonClass } from "@/components/ui/button";
import { glassCardClass } from "@/components/ui/glass-card";
import {
  ApiError,
  activateAdminUser,
  deactivateAdminUser,
  getAdminUser,
  type AdminUserDetail,
} from "@/lib/api";
import { clearSession, getSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

type LoadState = "loading" | "ready" | "error" | "not-found";

const bookingTone: Record<string, string> = {
  PENDING:
    "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-200",
  CONFIRMED:
    "border-sea-500/25 bg-sea-500/10 text-sea-700 dark:border-sea-300/25 dark:bg-sea-400/10 dark:text-sea-200",
  IN_PROGRESS:
    "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:border-sky-300/25 dark:bg-sky-400/10 dark:text-sky-200",
  COMPLETED:
    "border-green-700/25 bg-green-700/10 text-success dark:border-green-300/20 dark:bg-green-300/10",
  CANCELLED:
    "border-red-500/25 bg-red-500/10 text-red-700 dark:border-red-300/25 dark:bg-red-400/10 dark:text-red-200",
  REFUNDED:
    "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:border-violet-300/25 dark:bg-violet-400/10 dark:text-violet-200",
};

const statTone = {
  sea: "border-sea-500/20 bg-sea-500/10 text-sea-700 dark:border-sea-300/20 dark:bg-sea-400/10 dark:text-sea-200",
  sky: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:border-sky-300/20 dark:bg-sky-400/10 dark:text-sky-200",
  success:
    "border-green-700/20 bg-green-700/10 text-success dark:border-green-300/20 dark:bg-green-300/10",
  warning:
    "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-200",
};

function humanize(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function BookingStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[0.62rem] font-medium",
        bookingTone[status] ??
          "border-border/60 bg-surface-raised/60 text-muted-foreground dark:border-white/10 dark:bg-white/[0.04] dark:text-sky-300/75"
      )}
    >
      {humanize(status)}
    </span>
  );
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

function DetailSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-9 w-28 animate-pulse rounded-full bg-muted/55 dark:bg-white/[0.055]" />
      <section className={glassCardClass("p-6 sm:p-8")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="size-16 animate-pulse rounded-2xl bg-muted/60 dark:bg-white/[0.06]" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-7 w-56 max-w-full animate-pulse rounded-lg bg-muted/60 dark:bg-white/[0.06]" />
            <div className="h-4 w-72 max-w-full animate-pulse rounded bg-muted/45 dark:bg-white/[0.045]" />
            <div className="h-5 w-40 animate-pulse rounded-full bg-muted/40 dark:bg-white/[0.04]" />
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
            className={glassCardClass("h-32 animate-pulse bg-muted/20 dark:bg-white/[0.02]")}
          />
        ))}
      </div>
      <section className={glassCardClass("h-72 animate-pulse bg-muted/20 dark:bg-white/[0.02]")} />
    </div>
  );
}

export function UserProfile({ id }: { id: string }) {
  const router = useRouter();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [statusAction, setStatusAction] = useState<UserStatusAction | null>(
    null
  );
  const [statusPending, setStatusPending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    setCurrentUserId(getSession()?.user.id ?? null);
  }, []);

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
              ? "Please sign in again to view account profiles."
              : "Your account no longer has admin access.",
        }
      );
      router.replace("/login");
      return true;
    },
    [router]
  );

  const load = useCallback(async () => {
    setState("loading");
    setError("");

    try {
      const result = await getAdminUser(id);
      setUser(result.data);
      setState("ready");
    } catch (err) {
      if (handleAuthFailure(err)) return;

      if (err instanceof ApiError && err.status === 404) {
        setUser(null);
        setError("This account no longer exists.");
        setState("not-found");
        return;
      }

      setError(
        err instanceof ApiError
          ? err.message
          : "We couldn't load this account profile."
      );
      setState("error");
    }
  }, [handleAuthFailure, id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirmStatus(reason: string) {
    if (!user || !statusAction || statusPending) return;

    setStatusPending(true);

    try {
      const result =
        statusAction === "deactivate"
          ? await deactivateAdminUser(user.id, reason || undefined)
          : await activateAdminUser(user.id);

      const detail = [
        result.data.message,
        result.data.sessionsRevoked ? "Active sessions were revoked." : null,
        result.data.bookingsCancelled
          ? `${result.data.bookingsCancelled} upcoming booking${
              result.data.bookingsCancelled === 1 ? "" : "s"
            } cancelled.`
          : null,
      ]
        .filter(Boolean)
        .join(" ");

      toast.success(
        statusAction === "deactivate"
          ? "Account suspended"
          : "Account restored",
        { description: detail }
      );

      setStatusAction(null);
      await load();
    } catch (err) {
      if (handleAuthFailure(err)) return;

      toast.error(
        statusAction === "deactivate"
          ? "Couldn't suspend the account"
          : "Couldn't restore the account",
        {
          description:
            err instanceof ApiError
              ? err.message
              : "Please try again in a moment.",
        }
      );

      if (err instanceof ApiError && err.status === 409) {
        setStatusAction(null);
        await load();
      }
    } finally {
      setStatusPending(false);
    }
  }

  if (state === "loading" && !user) {
    return <DetailSkeleton />;
  }

  if (!user) {
    const notFound = state === "not-found";

    return (
      <div className="space-y-3">
        <Link
          href="/admin/users"
          className={buttonClass({
            variant: "ghost",
            size: "sm",
            className: "-ml-1 h-9 text-muted-foreground hover:text-foreground",
          })}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to users
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
                <UserRound aria-hidden="true" className="size-5" />
              ) : (
                <AlertTriangle aria-hidden="true" className="size-5" />
              )}
            </span>
            <h1 className="mt-4 font-display text-title font-semibold text-foreground">
              {notFound ? "Account not found" : "Account profile unavailable"}
            </h1>
            <p className="mt-1.5 text-body-sm text-muted-foreground dark:text-sky-300/70">
              {notFound
                ? "The account may have been removed, or the link is no longer valid."
                : error}
            </p>
            <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
              {!notFound && (
                <button
                  type="button"
                  onClick={() => void load()}
                  className={buttonClass({ variant: "gradient", size: "default" })}
                >
                  <RefreshCw aria-hidden="true" className="size-4" />
                  Try again
                </button>
              )}
              <Link
                href="/admin/users"
                className={buttonClass({
                  variant: "outline",
                  size: "default",
                })}
              >
                <ArrowLeft aria-hidden="true" className="size-4" />
                Back to directory
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const isSelf = user.id === currentUserId;
  const name = getUserName(user);
  const activeServices = user.business
    ? user.business.services.filter((service) => service.isActive).length
    : 0;

  return (
    <div className="space-y-3">
      <Link
        href="/admin/users"
        className={buttonClass({
          variant: "ghost",
          size: "sm",
          className: "-ml-1 h-9 text-muted-foreground hover:text-foreground",
        })}
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to users
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
                Profile refresh failed
              </p>
              <p className="mt-0.5 text-caption text-muted-foreground dark:text-sky-300/70">
                {error}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void load()}
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
            <AccountAvatar user={user} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-label font-medium uppercase tracking-[0.18em] text-sea-700 dark:text-sea-300">
                  Platform · Account profile
                </p>
                <RoleBadge role={user.role} />
                <StatusBadge isActive={user.isActive} />
                {isSelf && (
                  <span className="rounded-full border border-sea-500/25 bg-sea-500/10 px-2 py-0.5 font-mono text-[0.58rem] font-medium uppercase tracking-[0.12em] text-sea-700 dark:border-sea-300/25 dark:bg-sea-400/10 dark:text-sea-200">
                    Your account
                  </span>
                )}
              </div>

              <h1 className="mt-2 text-balance bg-gradient-to-r from-sea-800 via-sea-600 to-sea-400 bg-clip-text font-display text-h2 font-semibold text-transparent dark:from-sea-300 dark:via-sky-200 dark:to-white">
                {name}
              </h1>

              <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-body-sm text-muted-foreground dark:text-sky-300/75">
                <Mail aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="break-all">{user.email}</span>
                {user.emailVerified ? (
                  <span className="inline-flex items-center gap-1 text-caption text-success">
                    <CheckCircle2 aria-hidden="true" className="size-3.5" />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-caption text-amber-700 dark:text-amber-300">
                    <AlertCircle aria-hidden="true" className="size-3.5" />
                    Unverified
                  </span>
                )}
              </p>

              <p className="mt-1 text-caption text-muted-foreground dark:text-sky-300/65">
                {roleDescriptions[user.role]}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
            <button
              type="button"
              onClick={() =>
                setStatusAction(user.isActive ? "deactivate" : "activate")
              }
              disabled={isSelf}
              title={
                isSelf
                  ? "You cannot change your own account status"
                  : user.isActive
                    ? "Suspend this account"
                    : "Restore this account"
              }
              className={cn(
                "inline-flex h-10 items-center justify-center gap-2 rounded-full border px-4 text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500/60 disabled:cursor-not-allowed disabled:opacity-40 dark:focus-visible:ring-sea-300/60",
                user.isActive
                  ? "border-red-500/25 text-red-700 hover:border-red-500/40 hover:bg-red-500/10 dark:border-red-300/25 dark:text-red-200 dark:hover:border-red-300/40 dark:hover:bg-red-400/10"
                  : "border-green-700/30 text-success hover:border-green-700/45 hover:bg-green-700/10 dark:border-green-300/25 dark:hover:border-green-300/40 dark:hover:bg-green-300/10"
              )}
            >
              {user.isActive ? (
                <UserX aria-hidden="true" className="size-4" />
              ) : (
                <UserCheck aria-hidden="true" className="size-4" />
              )}
              {user.isActive ? "Suspend account" : "Restore account"}
            </button>

            <button
              type="button"
              onClick={() => void load()}
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
              Refresh profile
            </button>
          </div>
        </div>

        <dl className="relative mt-6 grid gap-3 border-t border-border/50 pt-4 dark:border-white/10 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <dt className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-sky-400/60">
              Account ID
            </dt>
            <dd
              title={user.id}
              className="mt-1 truncate font-mono text-caption text-foreground/90 dark:text-paper/90"
            >
              {user.id}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-sky-400/60">
              Phone
            </dt>
            <dd className="mt-1 flex items-center gap-1.5 text-caption text-foreground/90 dark:text-paper/90">
              <Phone aria-hidden="true" className="size-3.5 text-muted-foreground" />
              {user.customer?.phone || "Not provided"}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-sky-400/60">
              Joined
            </dt>
            <dd className="mt-1 flex items-center gap-1.5 text-caption text-foreground/90 dark:text-paper/90">
              <CalendarDays
                aria-hidden="true"
                className="size-3.5 text-muted-foreground"
              />
              {formatUserDate(user.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-sky-400/60">
              Last sign-in
            </dt>
            <dd
              title={formatUserDateTime(user.lastLoginAt)}
              className="mt-1 flex items-center gap-1.5 text-caption text-foreground/90 dark:text-paper/90"
            >
              <Clock3
                aria-hidden="true"
                className="size-3.5 text-muted-foreground"
              />
              {formatUserRelativeTime(user.lastLoginAt)}
            </dd>
          </div>
        </dl>
      </section>

      {user.role === "CUSTOMER" && user.customer && (
        <>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <ProfileStat
              label="Vehicles"
              value={formatUserCount(user.customer.vehicleCount)}
              hint="Registered in the garage"
              icon={Car}
              tone="sea"
            />
            <ProfileStat
              label="Bookings"
              value={formatUserCount(user.customer.bookingCount)}
              hint="Lifetime bookings"
              icon={ClipboardList}
              tone="sky"
            />
            <ProfileStat
              label="Reviews"
              value={formatUserCount(user.customer.reviewCount)}
              hint="Written by this customer"
              icon={Star}
              tone="warning"
            />
            <ProfileStat
              label="Favourites"
              value={formatUserCount(user.customer.favoriteCount)}
              hint="Saved businesses"
              icon={Heart}
              tone="success"
            />
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <section className={glassCardClass("p-5 sm:p-6")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-title font-semibold text-foreground">
                    Vehicles
                  </h2>
                  <p className="mt-1 text-caption text-muted-foreground dark:text-sky-300/70">
                    The customer&apos;s registered garage.
                  </p>
                </div>
                <span className="rounded-full border border-border/60 bg-surface-raised/60 px-2.5 py-1 font-mono text-[0.6rem] font-medium uppercase tracking-[0.12em] text-muted-foreground dark:border-white/10 dark:bg-white/[0.04] dark:text-sky-300/70">
                  {formatUserCount(user.customer.vehicleCount)}
                </span>
              </div>

              {user.customer.vehicles.length === 0 ? (
                <div className="mt-4 rounded-xl border border-border/55 bg-surface-raised/40 p-6 text-center dark:border-white/10 dark:bg-white/[0.025]">
                  <Car
                    aria-hidden="true"
                    className="mx-auto size-6 text-muted-foreground/60"
                  />
                  <p className="mt-2 text-body-sm font-medium text-foreground">
                    No vehicles registered
                  </p>
                  <p className="mt-0.5 text-caption text-muted-foreground dark:text-sky-300/65">
                    Vehicles will appear after the customer adds one.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {user.customer.vehicles.map((vehicle) => (
                    <article
                      key={vehicle.id}
                      className="rounded-xl border border-border/55 bg-surface-raised/40 p-3.5 dark:border-white/10 dark:bg-white/[0.025]"
                    >
                      <div className="flex items-start gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-sea-500/20 bg-sea-500/10 text-sea-700 dark:border-sea-300/20 dark:bg-sea-400/10 dark:text-sea-200">
                          <Car aria-hidden="true" className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-body-sm font-medium text-foreground">
                              {vehicle.make} {vehicle.model}
                            </p>
                            <span className="font-mono text-caption text-muted-foreground dark:text-sky-400/65">
                              {vehicle.year}
                            </span>
                          </div>
                          <p className="mt-1 font-mono text-caption uppercase tracking-[0.08em] text-muted-foreground dark:text-sky-300/70">
                            {vehicle.licensePlate}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            <span className="rounded-md border border-border/55 bg-surface/50 px-1.5 py-0.5 text-[0.6rem] text-muted-foreground dark:border-white/10 dark:bg-white/[0.035] dark:text-sky-300/70">
                              {humanize(vehicle.type)}
                            </span>
                            <span className="rounded-md border border-border/55 bg-surface/50 px-1.5 py-0.5 text-[0.6rem] text-muted-foreground dark:border-white/10 dark:bg-white/[0.035] dark:text-sky-300/70">
                              {humanize(vehicle.size)}
                            </span>
                            {vehicle.color && (
                              <span className="rounded-md border border-border/55 bg-surface/50 px-1.5 py-0.5 text-[0.6rem] text-muted-foreground dark:border-white/10 dark:bg-white/[0.035] dark:text-sky-300/70">
                                {vehicle.color}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className={glassCardClass("p-5 sm:p-6")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-title font-semibold text-foreground">
                    Recent bookings
                  </h2>
                  <p className="mt-1 text-caption text-muted-foreground dark:text-sky-300/70">
                    The ten most recent appointments for this customer.
                  </p>
                </div>
                <span className="rounded-full border border-border/60 bg-surface-raised/60 px-2.5 py-1 font-mono text-[0.6rem] font-medium uppercase tracking-[0.12em] text-muted-foreground dark:border-white/10 dark:bg-white/[0.04] dark:text-sky-300/70">
                  Recent
                </span>
              </div>

              {user.customer.recentBookings.length === 0 ? (
                <div className="mt-4 rounded-xl border border-border/55 bg-surface-raised/40 p-6 text-center dark:border-white/10 dark:bg-white/[0.025]">
                  <ClipboardList
                    aria-hidden="true"
                    className="mx-auto size-6 text-muted-foreground/60"
                  />
                  <p className="mt-2 text-body-sm font-medium text-foreground">
                    No bookings yet
                  </p>
                  <p className="mt-0.5 text-caption text-muted-foreground dark:text-sky-300/65">
                    Booking activity will appear here once the customer books a
                    service.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mt-4 hidden overflow-x-auto sm:block">
                    <table className="w-full min-w-[34rem] text-left">
                      <caption className="sr-only">
                        Recent bookings for this customer
                      </caption>
                      <thead>
                        <tr className="border-b border-border/55 text-[0.6rem] uppercase tracking-[0.13em] text-muted-foreground dark:border-white/10 dark:text-sky-400/60">
                          <th scope="col" className="pb-2 font-medium">
                            Service
                          </th>
                          <th scope="col" className="pb-2 font-medium">
                            Date
                          </th>
                          <th scope="col" className="pb-2 font-medium">
                            Status
                          </th>
                          <th scope="col" className="pb-2 text-right font-medium">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/45 dark:divide-white/[0.07]">
                        {user.customer.recentBookings.map((booking) => (
                          <tr key={booking.id}>
                            <td className="py-2.5 pr-3">
                              <p className="text-body-sm font-medium text-foreground">
                                {booking.service?.name ?? "Service"}
                              </p>
                              <p className="mt-0.5 truncate text-caption text-muted-foreground dark:text-sky-300/65">
                                {booking.business?.name ?? "Lumina partner"}
                              </p>
                            </td>
                            <td className="whitespace-nowrap py-2.5 pr-3">
                              <p className="text-caption text-foreground/90 dark:text-paper/90">
                                {formatUserDate(booking.date)}
                              </p>
                              <p className="mt-0.5 font-mono text-[0.6rem] text-muted-foreground dark:text-sky-400/60">
                                {booking.timeSlot}
                              </p>
                            </td>
                            <td className="py-2.5 pr-3">
                              <BookingStatusBadge status={booking.status} />
                            </td>
                            <td className="whitespace-nowrap py-2.5 text-right text-caption font-medium tabular-nums text-foreground/90 dark:text-paper/90">
                              {formatUserCurrency(booking.totalPrice)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 divide-y divide-border/45 dark:divide-white/[0.07] sm:hidden">
                    {user.customer.recentBookings.map((booking) => (
                      <div key={booking.id} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-body-sm font-medium text-foreground">
                              {booking.service?.name ?? "Service"}
                            </p>
                            <p className="mt-0.5 truncate text-caption text-muted-foreground dark:text-sky-300/65">
                              {booking.business?.name ?? "Lumina partner"}
                            </p>
                          </div>
                          <p className="shrink-0 text-caption font-medium tabular-nums text-foreground/90 dark:text-paper/90">
                            {formatUserCurrency(booking.totalPrice)}
                          </p>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span className="text-caption text-muted-foreground dark:text-sky-300/65">
                            {formatUserDate(booking.date)} · {booking.timeSlot}
                          </span>
                          <BookingStatusBadge status={booking.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>
        </>
      )}

      {user.role === "BUSINESS" && user.business && (
        <>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <ProfileStat
              label="Services"
              value={formatUserCount(user.business.serviceCount)}
              hint="Published offerings"
              icon={Wrench}
              tone="sea"
            />
            <ProfileStat
              label="Active services"
              value={formatUserCount(activeServices)}
              hint="Currently bookable"
              icon={CheckCircle2}
              tone="success"
            />
            <ProfileStat
              label="Bookings"
              value={formatUserCount(user.business.bookingCount)}
              hint="Lifetime bookings"
              icon={ClipboardList}
              tone="sky"
            />
            <ProfileStat
              label="Reviews"
              value={formatUserCount(user.business.reviewCount)}
              hint="Received by the business"
              icon={Star}
              tone="warning"
            />
          </div>

          <section className={glassCardClass("p-5 sm:p-6")}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Store
                    aria-hidden="true"
                    className="size-4 text-sea-600 dark:text-sea-300"
                  />
                  <h2 className="font-display text-title font-semibold text-foreground">
                    {user.business.name}
                  </h2>
                </div>
                <p className="mt-1 text-caption text-muted-foreground dark:text-sky-300/70">
                  Services published by this partner business.
                </p>
              </div>
              <span className="rounded-full border border-border/60 bg-surface-raised/60 px-2.5 py-1 font-mono text-[0.6rem] font-medium uppercase tracking-[0.12em] text-muted-foreground dark:border-white/10 dark:bg-white/[0.04] dark:text-sky-300/70">
                {formatUserCount(activeServices)} active
              </span>
            </div>

            {user.business.services.length === 0 ? (
              <div className="mt-4 rounded-xl border border-border/55 bg-surface-raised/40 p-6 text-center dark:border-white/10 dark:bg-white/[0.025]">
                <Wrench
                  aria-hidden="true"
                  className="mx-auto size-6 text-muted-foreground/60"
                />
                <p className="mt-2 text-body-sm font-medium text-foreground">
                  No services published
                </p>
                <p className="mt-0.5 text-caption text-muted-foreground dark:text-sky-300/65">
                  The partner has not added any services yet.
                </p>
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[38rem] text-left">
                  <caption className="sr-only">
                    Services published by this business
                  </caption>
                  <thead>
                    <tr className="border-b border-border/55 text-[0.6rem] uppercase tracking-[0.13em] text-muted-foreground dark:border-white/10 dark:text-sky-400/60">
                      <th scope="col" className="pb-2 font-medium">
                        Service
                      </th>
                      <th scope="col" className="pb-2 font-medium">
                        Category
                      </th>
                      <th scope="col" className="pb-2 font-medium">
                        Duration
                      </th>
                      <th scope="col" className="pb-2 font-medium">
                        Price
                      </th>
                      <th scope="col" className="pb-2 text-right font-medium">
                        State
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/45 dark:divide-white/[0.07]">
                    {user.business.services.map((service) => (
                      <tr key={service.id}>
                        <td className="py-2.5 pr-3 text-body-sm font-medium text-foreground">
                          {service.name}
                        </td>
                        <td className="py-2.5 pr-3 text-caption text-muted-foreground dark:text-sky-300/70">
                          {humanize(service.category)}
                        </td>
                        <td className="whitespace-nowrap py-2.5 pr-3 text-caption text-muted-foreground dark:text-sky-300/70">
                          {service.durationMinutes} min
                        </td>
                        <td className="whitespace-nowrap py-2.5 pr-3 text-caption font-medium tabular-nums text-foreground/90 dark:text-paper/90">
                          {formatUserCurrency(service.basePrice)}
                        </td>
                        <td className="py-2.5 text-right">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.62rem] font-medium",
                              service.isActive
                                ? "border-green-700/25 bg-green-700/10 text-success dark:border-green-300/20 dark:bg-green-300/10"
                                : "border-border/60 bg-surface-raised/60 text-muted-foreground dark:border-white/10 dark:bg-white/[0.04] dark:text-sky-300/70"
                            )}
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                "size-1.5 rounded-full",
                                service.isActive
                                  ? "bg-green-700 dark:bg-green-300"
                                  : "bg-muted-foreground/50"
                              )}
                            />
                            {service.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {user.role === "ADMIN" && (
        <section className={glassCardClass("p-5 sm:p-6")}>
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-sea-500/20 bg-sea-500/10 text-sea-700 dark:border-sea-300/20 dark:bg-sea-400/10 dark:text-sea-200">
              <ShieldCheck aria-hidden="true" className="size-[18px]" />
            </span>
            <div>
              <h2 className="font-display text-title font-semibold text-foreground">
                Platform administrator
              </h2>
              <p className="mt-1 max-w-2xl text-body-sm text-muted-foreground dark:text-sky-300/70">
                This account has full access to the Lumina admin console. It can
                manage users, businesses, bookings, reviews, reports, and the
                audit trail.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[
                  "Users",
                  "Businesses",
                  "Bookings",
                  "Reviews",
                  "Reports",
                  "Audit",
                ].map((area) => (
                  <span
                    key={area}
                    className="rounded-md border border-border/55 bg-surface-raised/50 px-2 py-0.5 text-[0.62rem] text-muted-foreground dark:border-white/10 dark:bg-white/[0.035] dark:text-sky-300/70"
                  >
                    {area}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-caption text-muted-foreground dark:text-sky-300/65">
                Suspending this account revokes its console sessions immediately.
              </p>
            </div>
          </div>
        </section>
      )}

      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-label text-muted-foreground dark:text-sky-400/60">
        <span>
          Source:{" "}
          <code className="font-mono">GET /api/v1/admin/users/:id</code>
        </span>
        <span aria-hidden="true">·</span>
        <span>Status changes are audited by the backend</span>
      </p>

      <UserStatusDialog
        open={Boolean(statusAction)}
        action={statusAction ?? "deactivate"}
        displayName={name}
        email={user.email}
        role={user.role}
        pending={statusPending}
        onCancel={() => {
          if (!statusPending) setStatusAction(null);
        }}
        onConfirm={(reason) => void confirmStatus(reason)}
      />
    </div>
  );
}
