"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Ban,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  Star,
  Store,
  UserRound,
  Wallet,
  Wrench,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  BusinessActionDialog,
  type BusinessAction,
} from "@/components/dashboard/BusinessActionDialog";
import {
  BusinessActiveBadge,
  BusinessAvatar,
  VerificationBadge,
} from "@/components/dashboard/BusinessBadges";
import {
  formatBusinessRating,
  getBusinessFullAddress,
  getBusinessLocation,
  humanizeBusinessValue,
} from "@/components/dashboard/business-utils";
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
  deactivateAdminBusiness,
  getAdminBusiness,
  verifyAdminBusiness,
  type AdminBusinessDetail,
} from "@/lib/api";
import {
  getCachedBusinessDetail,
  invalidateAdminBusinessCache,
  setCachedBusinessDetail,
} from "@/lib/admin-business-cache";
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
};

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
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
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

export function BusinessProfile({ id }: { id: string }) {
  const router = useRouter();
  const requestRef = useRef(0);
  const [business, setBusiness] = useState<AdminBusinessDetail | null>(
    () => getCachedBusinessDetail(id)?.data ?? null
  );
  const [state, setState] = useState<LoadState>(() =>
    getCachedBusinessDetail(id) ? "ready" : "loading"
  );
  const [error, setError] = useState("");
  const [action, setAction] = useState<BusinessAction | null>(null);
  const [actionPending, setActionPending] = useState(false);

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
              ? "Please sign in again to view partner profiles."
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

      const cached = force ? null : getCachedBusinessDetail(id);

      if (cached) {
        setBusiness(cached.data);
        setError("");
        setState(cached.fresh ? "ready" : "loading");

        if (cached.fresh) return;
      } else {
        setState("loading");
        setError("");
      }

      try {
        const result = await getAdminBusiness(id);
        if (requestRef.current !== requestId) return;

        setBusiness(result.data);
        setCachedBusinessDetail(id, result.data);
        setState("ready");
      } catch (err) {
        if (requestRef.current !== requestId) return;
        if (handleAuthFailure(err)) return;

        if (err instanceof ApiError && err.status === 404) {
          setBusiness(null);
          setError("This business no longer exists.");
          setState("not-found");
          return;
        }

        setError(
          err instanceof ApiError
            ? err.message
            : "We couldn't load this partner profile."
        );
        setState("error");
      }
    },
    [handleAuthFailure, id]
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function confirmAction(reason: string) {
    if (!business || !action || actionPending) return;

    setActionPending(true);

    try {
      if (action === "deactivate") {
        const result = await deactivateAdminBusiness(
          business.id,
          reason || undefined
        );

        toast.success("Business deactivated", {
          description: result.data.message,
        });
      } else {
        await verifyAdminBusiness(business.id, {
          action: action === "approve" ? "APPROVE" : "REJECT",
          reason: reason || undefined,
        });

        toast.success(
          action === "approve" ? "Business approved" : "Application rejected",
          {
            description:
              action === "approve"
                ? `${business.name} is now verified and the partner has been notified.`
                : "The rejection reason was recorded and the partner has been notified.",
          }
        );
      }

      invalidateAdminBusinessCache(business.id);
      setAction(null);
      await load(true);
    } catch (err) {
      if (handleAuthFailure(err)) return;

      toast.error(
        action === "deactivate"
          ? "Couldn't deactivate the business"
          : action === "approve"
            ? "Couldn't approve the business"
            : "Couldn't reject the application",
        {
          description:
            err instanceof ApiError
              ? err.message
              : "Please try again in a moment.",
        }
      );

      if (
        err instanceof ApiError &&
        (err.status === 404 || err.status === 409)
      ) {
        setAction(null);
        await load(true);
      }
    } finally {
      setActionPending(false);
    }
  }

  if (state === "loading" && !business) {
    return <DetailSkeleton />;
  }

  if (!business) {
    const notFound = state === "not-found";

    return (
      <div className="space-y-3">
        <Link
          href="/admin/businesses"
          className={buttonClass({
            variant: "ghost",
            size: "sm",
            className: "-ml-1 h-9 text-muted-foreground hover:text-foreground",
          })}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to businesses
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
                <Store aria-hidden="true" className="size-5" />
              ) : (
                <AlertTriangle aria-hidden="true" className="size-5" />
              )}
            </span>
            <h1 className="mt-4 font-display text-title font-semibold text-foreground">
              {notFound ? "Business not found" : "Partner profile unavailable"}
            </h1>
            <p className="mt-1.5 text-body-sm text-muted-foreground dark:text-sky-300/70">
              {notFound
                ? "The business may have been removed, or the link is no longer valid."
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
                href="/admin/businesses"
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

  const activeServices = business.services.filter(
    (service) => service.isActive
  ).length;
  const location = getBusinessLocation(business);
  const fullAddress = getBusinessFullAddress(business);
  const isPending = business.verificationStatus === "PENDING";
  const hasLocation =
    Number.isFinite(business.latitude) && Number.isFinite(business.longitude);
  const mapUrl = hasLocation
    ? `https://www.openstreetmap.org/?mlat=${business.latitude}&mlon=${business.longitude}#map=16/${business.latitude}/${business.longitude}`
    : null;

  return (
    <div className="space-y-3">
      <Link
        href="/admin/businesses"
        className={buttonClass({
          variant: "ghost",
          size: "sm",
          className: "-ml-1 h-9 text-muted-foreground hover:text-foreground",
        })}
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to businesses
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
            <BusinessAvatar business={business} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-label font-medium uppercase tracking-[0.18em] text-sea-700 dark:text-sea-300">
                  Platform · Partner profile
                </p>
                <VerificationBadge status={business.verificationStatus} />
                <BusinessActiveBadge isActive={business.isActive} />
              </div>

              <h1 className="mt-2 text-balance bg-gradient-to-r from-sea-800 via-sea-600 to-sea-400 bg-clip-text font-display text-h2 font-semibold text-transparent dark:from-sea-300 dark:via-sky-200 dark:to-white">
                {business.name}
              </h1>

              <p className="mt-2 max-w-2xl text-pretty text-body-sm text-muted-foreground dark:text-sky-300/75">
                {business.description || "No business description provided."}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-caption text-muted-foreground dark:text-sky-300/70">
                <a
                  href={`mailto:${business.email}`}
                  className="inline-flex items-center gap-1.5 break-all transition-colors hover:text-foreground dark:hover:text-paper"
                >
                  <Mail aria-hidden="true" className="size-3.5 shrink-0" />
                  {business.email}
                </a>
                <a
                  href={`tel:${business.phone}`}
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground dark:hover:text-paper"
                >
                  <Phone aria-hidden="true" className="size-3.5 shrink-0" />
                  {business.phone}
                </a>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
                  {location}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Star
                    aria-hidden="true"
                    className="size-3.5 shrink-0 fill-amber-400 text-amber-500 dark:fill-amber-300 dark:text-amber-300"
                  />
                  {business.reviewCount === 0
                    ? "No reviews yet"
                    : `${formatBusinessRating(business.rating)} · ${formatUserCount(
                        business.reviewCount
                      )} review${business.reviewCount === 1 ? "" : "s"}`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
            {isPending && (
              <>
                <button
                  type="button"
                  onClick={() => setAction("approve")}
                  className={buttonClass({
                    variant: "gradient",
                    size: "default",
                    className: "h-10",
                  })}
                >
                  <CheckCircle2 aria-hidden="true" className="size-4" />
                  Approve business
                </button>
                <button
                  type="button"
                  onClick={() => setAction("reject")}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-red-500/25 px-4 text-caption font-medium text-red-700 transition-colors hover:border-red-500/40 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500/60 dark:border-red-300/25 dark:text-red-200 dark:hover:border-red-300/40 dark:hover:bg-red-400/10 dark:focus-visible:ring-sea-300/60"
                >
                  <XCircle aria-hidden="true" className="size-4" />
                  Reject application
                </button>
              </>
            )}

            {business.isActive && (
              <button
                type="button"
                onClick={() => setAction("deactivate")}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-red-500/25 px-4 text-caption font-medium text-red-700 transition-colors hover:border-red-500/40 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500/60 dark:border-red-300/25 dark:text-red-200 dark:hover:border-red-300/40 dark:hover:bg-red-400/10 dark:focus-visible:ring-sea-300/60"
              >
                <Ban aria-hidden="true" className="size-4" />
                Deactivate business
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
              Refresh profile
            </button>
          </div>
        </div>

        <dl className="relative mt-6 grid gap-3 border-t border-border/50 pt-4 dark:border-white/10 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <dt className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-sky-400/60">
              Business ID
            </dt>
            <dd
              title={business.id}
              className="mt-1 truncate font-mono text-caption text-foreground/90 dark:text-paper/90"
            >
              {business.id}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-sky-400/60">
              Owner
            </dt>
            <dd className="mt-1 flex items-center gap-1.5 text-caption text-foreground/90 dark:text-paper/90">
              <UserRound
                aria-hidden="true"
                className="size-3.5 shrink-0 text-muted-foreground"
              />
              <Link
                href={`/admin/users/${business.owner.id}`}
                className="truncate text-sea-700 transition-colors hover:text-sea-900 dark:text-sea-200 dark:hover:text-white"
              >
                {business.owner.email}
              </Link>
              <ArrowUpRight
                aria-hidden="true"
                className="size-3 shrink-0 text-muted-foreground"
              />
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-sky-400/60">
              Timezone
            </dt>
            <dd className="mt-1 flex items-center gap-1.5 text-caption text-foreground/90 dark:text-paper/90">
              <Clock3
                aria-hidden="true"
                className="size-3.5 text-muted-foreground"
              />
              {business.timezone}
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
              {formatUserDate(business.createdAt)}
            </dd>
          </div>
        </dl>
      </section>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <ProfileStat
          label="Services"
          value={formatUserCount(business.services.length)}
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
          value={formatUserCount(business._count.bookings)}
          hint="Lifetime appointments"
          icon={CalendarDays}
          tone="sky"
        />
        <ProfileStat
          label="Reviews"
          value={formatUserCount(business._count.reviews)}
          hint={
            business.reviewCount === 0
              ? "No reviews yet"
              : `${formatBusinessRating(business.rating)} average rating`
          }
          icon={Star}
          tone="warning"
        />
        <ProfileStat
          label="Revenue"
          value={formatUserCurrency(business.totalRevenue)}
          hint="Completed payments"
          icon={Wallet}
          tone="sea"
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section className={glassCardClass("p-5 sm:p-6")}>
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-sea-500/20 bg-sea-500/10 text-sea-700 dark:border-sea-300/20 dark:bg-sea-400/10 dark:text-sea-200">
              <Store aria-hidden="true" className="size-[18px]" />
            </span>
            <div>
              <h2 className="font-display text-title font-semibold text-foreground">
                Business details
              </h2>
              <p className="mt-1 text-caption text-muted-foreground dark:text-sky-300/70">
                Contact, location, and ownership information for this partner.
              </p>
            </div>
          </div>

          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <DetailRow icon={Mail} label="Email">
              <a
                href={`mailto:${business.email}`}
                className="break-all text-sea-700 transition-colors hover:text-sea-900 dark:text-sea-200 dark:hover:text-white"
              >
                {business.email}
              </a>
            </DetailRow>
            <DetailRow icon={Phone} label="Phone">
              <a
                href={`tel:${business.phone}`}
                className="text-sea-700 transition-colors hover:text-sea-900 dark:text-sea-200 dark:hover:text-white"
              >
                {business.phone}
              </a>
            </DetailRow>
            <div className="sm:col-span-2">
              <DetailRow icon={MapPin} label="Address">
                {fullAddress}
              </DetailRow>
            </div>
          </dl>

          <div className="mt-5 flex flex-wrap gap-2">
            {mapUrl && (
              <a
                href={mapUrl}
                target="_blank"
                rel="noreferrer noopener"
                className={buttonClass({ variant: "outline", size: "sm" })}
              >
                <ExternalLink aria-hidden="true" className="size-3.5" />
                Open in maps
              </a>
            )}
            <a
              href={`mailto:${business.email}`}
              className={buttonClass({ variant: "outline", size: "sm" })}
            >
              <Mail aria-hidden="true" className="size-3.5" />
              Email partner
            </a>
            <a
              href={`tel:${business.phone}`}
              className={buttonClass({ variant: "outline", size: "sm" })}
            >
              <Phone aria-hidden="true" className="size-3.5" />
              Call partner
            </a>
          </div>

          <div className="mt-5 rounded-xl border border-border/55 bg-surface-raised/40 p-3.5 dark:border-white/10 dark:bg-white/[0.025]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-border/55 bg-surface/50 text-muted-foreground dark:border-white/10 dark:bg-white/[0.035] dark:text-sky-300/70">
                  <UserRound aria-hidden="true" className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-sky-400/60">
                    Owner account
                  </p>
                  <p className="mt-0.5 truncate text-body-sm font-medium text-foreground">
                    {business.owner.email}
                  </p>
                </div>
              </div>
              <Link
                href={`/admin/users/${business.owner.id}`}
                className={buttonClass({
                  variant: "outline",
                  size: "sm",
                  className: "shrink-0",
                })}
              >
                Open owner
                <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </Link>
            </div>
          </div>
        </section>

        <section className={glassCardClass("p-5 sm:p-6")}>
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-sea-500/20 bg-sea-500/10 text-sea-700 dark:border-sea-300/20 dark:bg-sea-400/10 dark:text-sea-200">
              <ShieldCheck aria-hidden="true" className="size-[18px]" />
            </span>
            <div>
              <h2 className="font-display text-title font-semibold text-foreground">
                Verification & status
              </h2>
              <p className="mt-1 text-caption text-muted-foreground dark:text-sky-300/70">
                The trust state and moderation trail for this partner.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <VerificationBadge status={business.verificationStatus} />
            <BusinessActiveBadge isActive={business.isActive} />
          </div>

          <dl className="mt-4 space-y-3">
            <div className="flex items-start justify-between gap-3 border-b border-border/45 pb-3 dark:border-white/[0.07]">
              <dt className="text-caption text-muted-foreground dark:text-sky-300/70">
                Verified at
              </dt>
              <dd className="text-right text-caption text-foreground/90 dark:text-paper/90">
                {business.verifiedAt
                  ? formatUserDateTime(business.verifiedAt)
                  : "Not verified"}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3 border-b border-border/45 pb-3 dark:border-white/[0.07]">
              <dt className="text-caption text-muted-foreground dark:text-sky-300/70">
                Reviewed by
              </dt>
              <dd className="min-w-0 text-right text-caption text-foreground/90 dark:text-paper/90">
                {business.verifiedBy ? (
                  <Link
                    href={`/admin/users/${business.verifiedBy}`}
                    title={business.verifiedBy}
                    className="inline-flex items-center gap-1 font-mono text-sea-700 transition-colors hover:text-sea-900 dark:text-sea-200 dark:hover:text-white"
                  >
                    <span className="max-w-[9rem] truncate">
                      {business.verifiedBy}
                    </span>
                    <ArrowUpRight
                      aria-hidden="true"
                      className="size-3 shrink-0"
                    />
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-caption text-muted-foreground dark:text-sky-300/70">
                Marketplace visibility
              </dt>
              <dd className="text-right text-caption text-foreground/90 dark:text-paper/90">
                {business.isActive ? "Live and discoverable" : "Offline"}
              </dd>
            </div>
          </dl>

          {business.rejectionReason && (
            <div className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 p-3 dark:border-red-300/25 dark:bg-red-400/10">
              <p className="flex items-center gap-1.5 font-mono text-[0.58rem] font-medium uppercase tracking-[0.14em] text-red-700 dark:text-red-200">
                <XCircle aria-hidden="true" className="size-3.5" />
                Rejection reason
              </p>
              <p className="mt-1.5 text-caption text-red-800 dark:text-red-100">
                {business.rejectionReason}
              </p>
            </div>
          )}

          {isPending && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 dark:border-amber-300/25 dark:bg-amber-300/10">
              <Clock3
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300"
              />
              <p className="text-caption text-amber-800 dark:text-amber-100">
                This application is awaiting a verification decision. Approve or
                reject it from the profile header.
              </p>
            </div>
          )}

          {!business.isActive && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 p-3 dark:border-red-300/25 dark:bg-red-400/10">
              <AlertTriangle
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-red-700 dark:text-red-200"
              />
              <p className="text-caption text-red-800 dark:text-red-100">
                This listing is offline. Reactivation is not available in the
                admin console yet.
              </p>
            </div>
          )}

          {!isPending && business.isActive && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-green-700/25 bg-green-700/10 p-3 dark:border-green-300/20 dark:bg-green-300/[0.06]">
              <CheckCircle2
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-success"
              />
              <p className="text-caption text-muted-foreground dark:text-sky-300/70">
                The partner is live and any approved verification state is
                available to the marketplace.
              </p>
            </div>
          )}
        </section>
      </div>

      <section className={glassCardClass("p-5 sm:p-6")}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Wrench
                aria-hidden="true"
                className="size-4 text-sea-600 dark:text-sea-300"
              />
              <h2 className="font-display text-title font-semibold text-foreground">
                Service catalogue
              </h2>
            </div>
            <p className="mt-1 text-caption text-muted-foreground dark:text-sky-300/70">
              Every service published by this partner, including pricing and
              availability state.
            </p>
          </div>
          <span className="rounded-full border border-border/60 bg-surface-raised/60 px-2.5 py-1 font-mono text-[0.6rem] font-medium uppercase tracking-[0.12em] text-muted-foreground dark:border-white/10 dark:bg-white/[0.04] dark:text-sky-300/70">
            {formatUserCount(activeServices)} active
          </span>
        </div>

        {business.services.length === 0 ? (
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
                Services published by this partner business
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
                {business.services.map((service) => (
                  <tr key={service.id}>
                    <td className="py-2.5 pr-3 text-body-sm font-medium text-foreground">
                      {service.name}
                    </td>
                    <td className="py-2.5 pr-3 text-caption text-muted-foreground dark:text-sky-300/70">
                      {humanizeBusinessValue(service.category)}
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

      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-label text-muted-foreground dark:text-sky-400/60">
        <span>
          Source:{" "}
          <code className="font-mono">
            GET /api/v1/admin/businesses/:id
          </code>
        </span>
        <span aria-hidden="true">·</span>
        <span>Verification and deactivation actions are audited by the backend</span>
      </p>

      <BusinessActionDialog
        open={Boolean(action)}
        action={action ?? "deactivate"}
        displayName={business.name}
        email={business.email}
        pending={actionPending}
        onCancel={() => {
          if (!actionPending) setAction(null);
        }}
        onConfirm={(reason) => void confirmAction(reason)}
      />
    </div>
  );
}
