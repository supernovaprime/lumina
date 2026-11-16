"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  Ban,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  Store,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { AdminPagination } from "@/components/dashboard/AdminPagination";
import { BusinessActionDialog } from "@/components/dashboard/BusinessActionDialog";
import {
  BusinessActiveBadge,
  BusinessAvatar,
  VerificationBadge,
} from "@/components/dashboard/BusinessBadges";
import {
  formatBusinessRating,
  getBusinessLocation,
} from "@/components/dashboard/business-utils";
import {
  formatUserCount,
  formatUserDate,
  formatUserRelativeTime,
} from "@/components/dashboard/user-utils";
import { buttonClass } from "@/components/ui/button";
import { glassCardClass } from "@/components/ui/glass-card";
import {
  ApiError,
  deactivateAdminBusiness,
  getAdminBusiness,
  listAdminBusinesses,
  type AdminBusinessListQuery,
  type AdminBusinessSummary,
  type ApiListMeta,
  type VerificationStatus,
} from "@/lib/api";
import {
  getCachedBusinessDetail,
  getCachedBusinessList,
  invalidateAdminBusinessCache,
  setCachedBusinessDetail,
  setCachedBusinessList,
} from "@/lib/admin-business-cache";
import { clearSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

type LoadState = "loading" | "ready" | "error";
type ActiveFilter = "all" | "active" | "inactive";
type ActionTarget = { business: AdminBusinessSummary };

const PAGE_SIZE = 10;

const statusFilters: Array<{
  value: VerificationStatus | "";
  label: string;
  icon: typeof Store;
}> = [
  { value: "", label: "All partners", icon: Store },
  { value: "PENDING", label: "Pending", icon: Clock3 },
  { value: "APPROVED", label: "Approved", icon: CheckCircle2 },
  { value: "REJECTED", label: "Rejected", icon: XCircle },
];

const emptyMeta: ApiListMeta = {
  page: 1,
  limit: PAGE_SIZE,
  total: 0,
  totalPages: 0,
};

export function BusinessesManager({
  initialStatus = "",
}: {
  initialStatus?: VerificationStatus | "";
}) {
  const router = useRouter();
  const requestRef = useRef(0);
  const prefetchedBusinessesRef = useRef(new Set<string>());
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<VerificationStatus | "">(initialStatus);
  const [activity, setActivity] = useState<ActiveFilter>("all");
  const [page, setPage] = useState(1);
  const [businesses, setBusinesses] = useState<AdminBusinessSummary[]>([]);
  const [meta, setMeta] = useState<ApiListMeta>(emptyMeta);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [actionTarget, setActionTarget] = useState<ActionTarget | null>(null);
  const [actionPending, setActionPending] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 320);

    return () => window.clearTimeout(timer);
  }, [search]);

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
              ? "Please sign in again to manage partner businesses."
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

      const query: AdminBusinessListQuery = {
        q: debouncedSearch || undefined,
        status: status || undefined,
        isActive:
          activity === "all" ? undefined : activity === "active",
        page,
        limit: PAGE_SIZE,
      };

      const cached = force ? null : getCachedBusinessList(query);

      if (cached) {
        setBusinesses(cached.data);
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
        const result = await listAdminBusinesses(query);
        if (requestRef.current !== requestId) return;

        const nextMeta = result.meta ?? emptyMeta;
        setBusinesses(result.data);
        setMeta(nextMeta);
        setUpdatedAt(new Date());
        setState("ready");
        setCachedBusinessList(query, result.data, nextMeta);
      } catch (err) {
        if (requestRef.current !== requestId) return;
        if (handleAuthFailure(err)) return;

        setError(
          err instanceof ApiError
            ? err.message
            : "We couldn't load the partner directory."
        );
        setState("error");
      }
    },
    [activity, debouncedSearch, handleAuthFailure, page, status]
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

  const pendingOnPage = useMemo(
    () =>
      businesses.filter(
        (business) => business.verificationStatus === "PENDING"
      ).length,
    [businesses]
  );
  const liveOnPage = useMemo(
    () => businesses.filter((business) => business.isActive).length,
    [businesses]
  );

  const hasFilters = Boolean(
    search || debouncedSearch || status || activity !== "all"
  );
  const showSkeleton = state === "loading" && businesses.length === 0;
  const isUpdating = state === "loading" && businesses.length > 0;
  const start = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const end = Math.min(meta.page * meta.limit, meta.total);

  function clearFilters() {
    setSearch("");
    setDebouncedSearch("");
    setStatus("");
    setActivity("all");
    setPage(1);
  }

  function prefetchBusiness(id: string) {
    if (
      prefetchedBusinessesRef.current.has(id) ||
      getCachedBusinessDetail(id)?.fresh
    ) {
      return;
    }

    prefetchedBusinessesRef.current.add(id);
    void getAdminBusiness(id)
      .then((result) => {
        setCachedBusinessDetail(id, result.data);
      })
      .catch(() => {
        prefetchedBusinessesRef.current.delete(id);
      });
  }

  function openDeactivate(business: AdminBusinessSummary) {
    setActionTarget({ business });
  }

  async function confirmDeactivate(reason: string) {
    if (!actionTarget || actionPending) return;

    setActionPending(true);

    try {
      const result = await deactivateAdminBusiness(
        actionTarget.business.id,
        reason || undefined
      );

      invalidateAdminBusinessCache(actionTarget.business.id);
      toast.success("Business deactivated", {
        description: result.data.message,
      });
      setActionTarget(null);
      await load(true);
    } catch (err) {
      if (handleAuthFailure(err)) return;

      toast.error("Couldn't deactivate the business", {
        description:
          err instanceof ApiError
            ? err.message
            : "Please try again in a moment.",
      });

      if (
        err instanceof ApiError &&
        (err.status === 404 || err.status === 409)
      ) {
        setActionTarget(null);
        await load(true);
      }
    } finally {
      setActionPending(false);
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
                Platform · Partner network
              </p>
              <span className="rounded-full border border-border/60 bg-surface-raised/70 px-2 py-0.5 font-mono text-[0.62rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:border-white/10 dark:bg-white/[0.04] dark:text-sky-300/75">
                Verification control
              </span>
            </div>

            <h1 className="mt-2 text-balance bg-gradient-to-r from-sea-800 via-sea-600 to-sea-400 bg-clip-text font-display text-h2 font-semibold text-transparent dark:from-sea-300 dark:via-sky-200 dark:to-white">
              Business management
            </h1>
            <p className="mt-3 max-w-2xl text-pretty text-body-sm text-muted-foreground dark:text-sky-300/75">
              Review partner applications, keep the marketplace trustworthy, and
              take a business offline without losing its services, bookings, or
              history.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-label text-muted-foreground dark:text-sky-400/70">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck
                  aria-hidden="true"
                  className="size-3.5 text-sea-600 dark:text-sea-300"
                />
                Admin-only directory
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
                Refresh directory
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
                Partners
              </p>
              <p className="mt-1 font-display text-xl font-semibold tabular-nums text-foreground">
                {state === "error" && businesses.length === 0
                  ? "—"
                  : formatUserCount(meta.total)}
              </p>
            </div>
            <div>
              <p className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-sky-400/60">
                Pending here
              </p>
              <p className="mt-1 font-display text-xl font-semibold tabular-nums text-amber-700 dark:text-amber-200">
                {showSkeleton ? "—" : formatUserCount(pendingOnPage)}
              </p>
            </div>
            <div>
              <p className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-sky-400/60">
                Live here
              </p>
              <p className="mt-1 font-display text-xl font-semibold tabular-nums text-success">
                {showSkeleton ? "—" : formatUserCount(liveOnPage)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-label="Partner filters"
        className={glassCardClass("p-3 sm:p-4")}
      >
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative min-w-0 flex-1 xl:max-w-md">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground dark:text-sky-400/60"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, city, or owner email…"
              aria-label="Search businesses by name, city, or owner email"
              className="h-10 w-full rounded-xl border border-border/70 bg-surface-raised/60 pl-9 pr-9 text-body-sm text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/65 focus:border-sea-500/60 focus:ring-2 focus:ring-sea-500/20 dark:border-white/10 dark:bg-white/[0.04] dark:placeholder:text-sky-400/40 dark:focus:border-sea-300/45 dark:focus:ring-sea-300/15"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface hover:text-foreground dark:hover:bg-white/10 dark:hover:text-paper"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between xl:justify-end">
            <div
              role="group"
              aria-label="Filter businesses by verification status"
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

            <div className="flex items-center gap-2">
              <div className="relative">
                <Store
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground dark:text-sky-400/60"
                />
                <select
                  value={activity}
                  onChange={(event) => {
                    setActivity(event.target.value as ActiveFilter);
                    setPage(1);
                  }}
                  aria-label="Filter businesses by listing state"
                  className="h-9 w-full appearance-none rounded-xl border border-border/70 bg-surface-raised/60 pl-8 pr-8 text-caption font-medium text-foreground outline-none transition-[border-color,box-shadow] focus:border-sea-500/60 focus:ring-2 focus:ring-sea-500/20 dark:border-white/10 dark:bg-white/[0.04] dark:focus:border-sea-300/45 dark:focus:ring-sea-300/15 sm:w-auto"
                >
                  <option value="all">Any listing state</option>
                  <option value="active">Live only</option>
                  <option value="inactive">Offline only</option>
                </select>
                <ChevronRight
                  aria-hidden="true"
                  className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 rotate-90 text-muted-foreground dark:text-sky-400/60"
                />
              </div>

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border/60 bg-surface-raised/40 px-2.5 text-caption font-medium text-muted-foreground transition-colors hover:border-sea-500/30 hover:text-foreground dark:border-white/10 dark:bg-white/[0.03] dark:text-sky-300/70 dark:hover:border-sea-300/25 dark:hover:text-paper"
                >
                  <X aria-hidden="true" className="size-3.5" />
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {state === "error" && businesses.length > 0 && (
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
                Partner directory unavailable
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
        aria-label="Partner businesses"
        aria-busy={state === "loading"}
        className={glassCardClass("min-h-[22rem] p-0")}
      >
        <div className="flex flex-col gap-2 border-b border-border/55 px-4 py-3 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-title font-semibold text-foreground">
              Partners
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
              ? "Loading partners…"
              : state === "error" && businesses.length === 0
                ? "Directory unavailable"
                : meta.total === 0
                  ? "No partners found"
                  : `Showing ${start}–${end} of ${formatUserCount(meta.total)}`}
          </p>
        </div>

        {showSkeleton ? (
          <div className="space-y-2 p-4 sm:p-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-[4.75rem] animate-pulse rounded-xl bg-muted/55 dark:bg-white/[0.055]"
              />
            ))}
          </div>
        ) : state === "error" && businesses.length === 0 ? (
          <div className="grid min-h-[18rem] place-items-center px-6 py-12 text-center">
            <div className="max-w-sm">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-200">
                <AlertTriangle aria-hidden="true" className="size-5" />
              </span>
              <h3 className="mt-4 font-display text-title font-semibold text-foreground">
                Partner directory unavailable
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
        ) : businesses.length === 0 ? (
          <div className="grid min-h-[18rem] place-items-center px-6 py-12 text-center">
            <div className="max-w-sm">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-sea-500/20 bg-sea-500/10 text-sea-700 dark:border-sea-300/20 dark:bg-sea-400/10 dark:text-sea-200">
                <Store aria-hidden="true" className="size-5" />
              </span>
              <h3 className="mt-4 font-display text-title font-semibold text-foreground">
                {hasFilters ? "No matching partners" : "No partners yet"}
              </h3>
              <p className="mt-1.5 text-body-sm text-muted-foreground dark:text-sky-300/70">
                {hasFilters
                  ? "Try a different name, city, owner email, verification status, or listing state."
                  : "Business applications will appear here as soon as a partner registers."}
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
              <table className="w-full min-w-[72rem] text-left">
                <caption className="sr-only">
                  Lumina partner businesses, including verification state,
                  location, activity, rating, and management controls
                </caption>
                <thead>
                  <tr className="border-b border-border/55 bg-surface-raised/35 text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground dark:border-white/10 dark:bg-white/[0.025] dark:text-sky-400/60">
                    <th scope="col" className="px-5 py-2.5 font-medium">
                      Business
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Verification
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Location
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Activity
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Rating
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Joined
                    </th>
                    <th scope="col" className="px-5 py-2.5 text-right font-medium">
                      Manage
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/45 dark:divide-white/[0.07]">
                  {businesses.map((business) => (
                    <tr
                      key={business.id}
                      className="group transition-colors hover:bg-surface-raised/40 dark:hover:bg-white/[0.025]"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex min-w-0 items-center gap-3">
                          <BusinessAvatar business={business} />
                          <div className="min-w-0">
                            <p className="truncate text-body-sm font-medium text-foreground">
                              {business.name}
                            </p>
                            <p className="mt-0.5 truncate text-caption text-muted-foreground dark:text-sky-300/70">
                              {business.email}
                            </p>
                            <p className="mt-0.5 truncate font-mono text-[0.6rem] text-muted-foreground/80 dark:text-sky-400/55">
                              Owner · {business.owner.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <VerificationBadge
                            status={business.verificationStatus}
                          />
                          <BusinessActiveBadge isActive={business.isActive} />
                        </div>
                      </td>
                      <td className="max-w-[13rem] px-3 py-3.5">
                        <p className="flex items-center gap-1.5 truncate text-caption text-foreground/90 dark:text-paper/90">
                          <MapPin
                            aria-hidden="true"
                            className="size-3.5 shrink-0 text-muted-foreground"
                          />
                          {getBusinessLocation(business)}
                        </p>
                        <p className="mt-0.5 font-mono text-[0.6rem] text-muted-foreground dark:text-sky-400/60">
                          {business.zipCode}
                        </p>
                      </td>
                      <td className="px-3 py-3.5">
                        <p className="text-caption text-muted-foreground dark:text-sky-300/70">
                          <span className="font-medium text-foreground/90 dark:text-paper/90">
                            {formatUserCount(business._count.services)}
                          </span>{" "}
                          service{business._count.services === 1 ? "" : "s"}
                        </p>
                        <p className="mt-0.5 text-caption text-muted-foreground dark:text-sky-300/70">
                          <span className="font-medium text-foreground/90 dark:text-paper/90">
                            {formatUserCount(business._count.bookings)}
                          </span>{" "}
                          booking{business._count.bookings === 1 ? "" : "s"}
                        </p>
                      </td>
                      <td className="px-3 py-3.5">
                        {business.reviewCount === 0 ? (
                          <span className="text-caption text-muted-foreground dark:text-sky-300/65">
                            No reviews
                          </span>
                        ) : (
                          <>
                            <p className="flex items-center gap-1 text-caption font-medium text-foreground/90 dark:text-paper/90">
                              <Star
                                aria-hidden="true"
                                className="size-3.5 fill-amber-400 text-amber-500 dark:fill-amber-300 dark:text-amber-300"
                              />
                              {formatBusinessRating(business.rating)}
                            </p>
                            <p className="mt-0.5 text-caption text-muted-foreground dark:text-sky-300/65">
                              {formatUserCount(business.reviewCount)} review
                              {business.reviewCount === 1 ? "" : "s"}
                            </p>
                          </>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5">
                        <span
                          title={formatUserRelativeTime(business.createdAt)}
                          className="text-caption text-muted-foreground dark:text-sky-300/70"
                        >
                          {formatUserDate(business.createdAt)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          {business.verificationStatus === "PENDING" ? (
                            <Link
                              href={`/admin/businesses/${business.id}`}
                              onMouseEnter={() =>
                                prefetchBusiness(business.id)
                              }
                              onFocus={() => prefetchBusiness(business.id)}
                              className={buttonClass({
                                variant: "outline",
                                size: "sm",
                                className: "h-8 px-2.5",
                              })}
                            >
                              <ShieldCheck
                                aria-hidden="true"
                                className="size-3.5"
                              />
                              Review
                              <ArrowUpRight
                                aria-hidden="true"
                                className="size-3.5"
                              />
                            </Link>
                          ) : (
                            <>
                              <Link
                                href={`/admin/businesses/${business.id}`}
                                onMouseEnter={() =>
                                  prefetchBusiness(business.id)
                                }
                                onFocus={() => prefetchBusiness(business.id)}
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
                              {business.isActive && (
                                <button
                                  type="button"
                                  onClick={() => openDeactivate(business)}
                                  title={`Deactivate ${business.name}`}
                                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-red-500/20 px-2.5 text-caption font-medium text-red-700 transition-colors hover:border-red-500/35 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500/60 dark:border-red-300/20 dark:text-red-200 dark:hover:border-red-300/35 dark:hover:bg-red-400/10 dark:focus-visible:ring-sea-300/60"
                                >
                                  <Ban
                                    aria-hidden="true"
                                    className="size-3.5"
                                  />
                                  Deactivate
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-border/45 dark:divide-white/[0.07] lg:hidden">
              {businesses.map((business) => (
                <article key={business.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <BusinessAvatar business={business} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body-sm font-medium text-foreground">
                        {business.name}
                      </p>
                      <p className="mt-0.5 truncate text-caption text-muted-foreground dark:text-sky-300/70">
                        {business.email}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <VerificationBadge
                          status={business.verificationStatus}
                        />
                        <BusinessActiveBadge isActive={business.isActive} />
                      </div>
                    </div>
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-border/50 bg-surface-raised/35 p-2.5 dark:border-white/10 dark:bg-white/[0.025]">
                    <div className="col-span-2">
                      <dt className="font-mono text-[0.56rem] font-medium uppercase tracking-[0.12em] text-muted-foreground dark:text-sky-400/55">
                        Location
                      </dt>
                      <dd className="mt-0.5 flex items-center gap-1 text-caption text-muted-foreground dark:text-sky-300/70">
                        <MapPin aria-hidden="true" className="size-3.5" />
                        {getBusinessLocation(business)} · {business.zipCode}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="font-mono text-[0.56rem] font-medium uppercase tracking-[0.12em] text-muted-foreground dark:text-sky-400/55">
                        Owner
                      </dt>
                      <dd className="mt-0.5 truncate text-caption text-muted-foreground dark:text-sky-300/70">
                        {business.owner.email}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-mono text-[0.56rem] font-medium uppercase tracking-[0.12em] text-muted-foreground dark:text-sky-400/55">
                        Services
                      </dt>
                      <dd className="mt-0.5 text-caption text-muted-foreground dark:text-sky-300/70">
                        {formatUserCount(business._count.services)}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-mono text-[0.56rem] font-medium uppercase tracking-[0.12em] text-muted-foreground dark:text-sky-400/55">
                        Bookings
                      </dt>
                      <dd className="mt-0.5 text-caption text-muted-foreground dark:text-sky-300/70">
                        {formatUserCount(business._count.bookings)}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-mono text-[0.56rem] font-medium uppercase tracking-[0.12em] text-muted-foreground dark:text-sky-400/55">
                        Rating
                      </dt>
                      <dd className="mt-0.5 flex items-center gap-1 text-caption text-muted-foreground dark:text-sky-300/70">
                        {business.reviewCount === 0 ? (
                          "No reviews"
                        ) : (
                          <>
                            <Star
                              aria-hidden="true"
                              className="size-3.5 fill-amber-400 text-amber-500 dark:fill-amber-300 dark:text-amber-300"
                            />
                            {formatBusinessRating(business.rating)} ·{" "}
                            {formatUserCount(business.reviewCount)}
                          </>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-mono text-[0.56rem] font-medium uppercase tracking-[0.12em] text-muted-foreground dark:text-sky-400/55">
                        Joined
                      </dt>
                      <dd className="mt-0.5 text-caption text-muted-foreground dark:text-sky-300/70">
                        {formatUserDate(business.createdAt)}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-3 flex items-center gap-2">
                    <Link
                      href={`/admin/businesses/${business.id}`}
                      onMouseEnter={() => prefetchBusiness(business.id)}
                      onFocus={() => prefetchBusiness(business.id)}
                      className={buttonClass({
                        variant: "outline",
                        size: "sm",
                        className: "flex-1",
                      })}
                    >
                      {business.verificationStatus === "PENDING"
                        ? "Review application"
                        : "Open profile"}
                      <ArrowUpRight aria-hidden="true" className="size-3.5" />
                    </Link>
                    {business.isActive &&
                      business.verificationStatus !== "PENDING" && (
                        <button
                          type="button"
                          onClick={() => openDeactivate(business)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-red-500/20 px-3 text-caption font-medium text-red-700 transition-colors hover:border-red-500/35 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500/60 dark:border-red-300/20 dark:text-red-200 dark:hover:border-red-300/35 dark:hover:bg-red-400/10 dark:focus-visible:ring-sea-300/60"
                        >
                          <Ban aria-hidden="true" className="size-3.5" />
                          Deactivate
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
          itemLabel="partners"
          onPageChange={setPage}
        />
      </section>

      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-label text-muted-foreground dark:text-sky-400/60">
        <span>
          Source:{" "}
          <code className="font-mono">GET /api/v1/admin/businesses</code>
        </span>
        <span aria-hidden="true">·</span>
        <span>Search, filters, and pagination are server-backed</span>
      </p>

      <BusinessActionDialog
        open={Boolean(actionTarget)}
        action="deactivate"
        displayName={actionTarget?.business.name ?? ""}
        email={actionTarget?.business.email ?? ""}
        pending={actionPending}
        onCancel={() => {
          if (!actionPending) setActionTarget(null);
        }}
        onConfirm={(reason) => void confirmDeactivate(reason)}
      />
    </div>
  );
}
