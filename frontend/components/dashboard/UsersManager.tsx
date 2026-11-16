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
  AlertCircle,
  AlertTriangle,
  ArrowDownUp,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  UserCheck,
  UserRound,
  Users,
  UserX,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { AdminPagination } from "@/components/dashboard/AdminPagination";
import {
  AccountAvatar,
  RoleBadge,
  StatusBadge,
} from "@/components/dashboard/UserBadges";
import { UserStatusDialog } from "@/components/dashboard/UserStatusDialog";
import {
  formatUserCount,
  formatUserDate,
  formatUserDateTime,
  formatUserRelativeTime,
  getUserName,
} from "@/components/dashboard/user-utils";
import { buttonClass } from "@/components/ui/button";
import { glassCardClass } from "@/components/ui/glass-card";
import {
  ApiError,
  activateAdminUser,
  deactivateAdminUser,
  getAdminUser,
  listAdminUsers,
  type AdminUserListQuery,
  type AdminUserSummary,
  type ApiListMeta,
  type UserRole,
} from "@/lib/api";
import { clearSession, getSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

type LoadState = "loading" | "ready" | "error";
type SortKey = "createdAt" | "lastLoginAt" | "email";
type SortOrder = "asc" | "desc";
type SortValue =
  | "createdAt:desc"
  | "createdAt:asc"
  | "lastLoginAt:desc"
  | "email:asc";

type StatusTarget = {
  user: AdminUserSummary;
  action: "activate" | "deactivate";
};

const PAGE_SIZE = 10;

const roleFilters: Array<{
  value: UserRole | "";
  label: string;
  icon: typeof Users;
}> = [
  { value: "", label: "Everyone", icon: Users },
  { value: "CUSTOMER", label: "Customers", icon: UserRound },
  { value: "BUSINESS", label: "Businesses", icon: Store },
  { value: "ADMIN", label: "Admins", icon: ShieldCheck },
];

const sortConfig: Record<
  SortValue,
  { label: string; sortBy: SortKey; sortOrder: SortOrder }
> = {
  "createdAt:desc": {
    label: "Newest accounts",
    sortBy: "createdAt",
    sortOrder: "desc",
  },
  "createdAt:asc": {
    label: "Oldest accounts",
    sortBy: "createdAt",
    sortOrder: "asc",
  },
  "lastLoginAt:desc": {
    label: "Recent sign-in",
    sortBy: "lastLoginAt",
    sortOrder: "desc",
  },
  "email:asc": {
    label: "Email A–Z",
    sortBy: "email",
    sortOrder: "asc",
  },
};

const emptyMeta: ApiListMeta = {
  page: 1,
  limit: PAGE_SIZE,
  total: 0,
  totalPages: 0,
};

function ActivitySummary({ user }: { user: AdminUserSummary }) {
  if (user.role === "ADMIN") {
    return (
      <span className="text-caption text-muted-foreground dark:text-sky-300/70">
        Platform access
      </span>
    );
  }

  if (user.customer) {
    return (
      <span className="text-caption text-muted-foreground dark:text-sky-300/70">
        <span className="font-medium text-foreground/90 dark:text-paper/90">
          {formatUserCount(user.customer.vehicleCount)}
        </span>{" "}
        vehicle{user.customer.vehicleCount === 1 ? "" : "s"} ·{" "}
        <span className="font-medium text-foreground/90 dark:text-paper/90">
          {formatUserCount(user.customer.bookingCount)}
        </span>{" "}
        booking{user.customer.bookingCount === 1 ? "" : "s"}
      </span>
    );
  }

  if (user.business) {
    return (
      <span className="text-caption text-muted-foreground dark:text-sky-300/70">
        <span className="font-medium text-foreground/90 dark:text-paper/90">
          {formatUserCount(user.business.serviceCount)}
        </span>{" "}
        service{user.business.serviceCount === 1 ? "" : "s"} ·{" "}
        <span className="font-medium text-foreground/90 dark:text-paper/90">
          {formatUserCount(user.business.bookingCount)}
        </span>{" "}
        booking{user.business.bookingCount === 1 ? "" : "s"}
      </span>
    );
  }

  return (
    <span className="text-caption text-muted-foreground dark:text-sky-300/70">
      No linked profile
    </span>
  );
}

export function UsersManager() {
  const router = useRouter();
  const requestRef = useRef(0);
  const prefetchedUsersRef = useRef(new Set<string>());
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [sortValue, setSortValue] = useState<SortValue>("createdAt:desc");
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [meta, setMeta] = useState<ApiListMeta>(emptyMeta);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<StatusTarget | null>(null);
  const [statusPending, setStatusPending] = useState(false);

  const sort = sortConfig[sortValue];

  useEffect(() => {
    setCurrentUserId(getSession()?.user.id ?? null);
  }, []);

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
              ? "Please sign in again to manage platform accounts."
              : "Your account no longer has admin access.",
        }
      );
      router.replace("/login");
      return true;
    },
    [router]
  );

  const load = useCallback(async () => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setState("loading");
    setError("");

    const query: AdminUserListQuery = {
      q: debouncedSearch || undefined,
      role: role || undefined,
      page,
      limit: PAGE_SIZE,
      sortBy: sort.sortBy,
      sortOrder: sort.sortOrder,
    };

    try {
      const result = await listAdminUsers(query);
      if (requestRef.current !== requestId) return;

      setUsers(result.data);
      setMeta(result.meta ?? emptyMeta);
      setUpdatedAt(new Date());
      setState("ready");
    } catch (err) {
      if (requestRef.current !== requestId) return;
      if (handleAuthFailure(err)) return;

      setError(
        err instanceof ApiError
          ? err.message
          : "We couldn't load the account directory."
      );
      setState("error");
    }
  }, [debouncedSearch, handleAuthFailure, page, role, sort.sortBy, sort.sortOrder]);

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

  const activeOnPage = useMemo(
    () => users.filter((user) => user.isActive).length,
    [users]
  );
  const suspendedOnPage = users.length - activeOnPage;

  const hasFilters = Boolean(debouncedSearch || role || search);
  const showSkeleton = state === "loading" && users.length === 0;
  const isUpdating = state === "loading" && users.length > 0;
  const start = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const end = Math.min(meta.page * meta.limit, meta.total);

  function clearFilters() {
    setSearch("");
    setDebouncedSearch("");
    setRole("");
    setSortValue("createdAt:desc");
    setPage(1);
  }

  function openStatusDialog(user: AdminUserSummary) {
    setStatusTarget({
      user,
      action: user.isActive ? "deactivate" : "activate",
    });
  }

  function prefetchUser(id: string) {
    if (prefetchedUsersRef.current.has(id)) return;
    prefetchedUsersRef.current.add(id);
    void getAdminUser(id).catch(() => {
      prefetchedUsersRef.current.delete(id);
    });
  }

  async function confirmStatus(reason: string) {
    if (!statusTarget || statusPending) return;

    setStatusPending(true);

    try {
      const result =
        statusTarget.action === "deactivate"
          ? await deactivateAdminUser(
              statusTarget.user.id,
              reason || undefined
            )
          : await activateAdminUser(statusTarget.user.id);

      const status = result.data;
      const detail = [
        status.message,
        status.sessionsRevoked ? "Active sessions were revoked." : null,
        status.bookingsCancelled
          ? `${status.bookingsCancelled} upcoming booking${
              status.bookingsCancelled === 1 ? "" : "s"
            } cancelled.`
          : null,
      ]
        .filter(Boolean)
        .join(" ");

      toast.success(
        statusTarget.action === "deactivate"
          ? "Account suspended"
          : "Account restored",
        { description: detail }
      );

      setStatusTarget(null);
      await load();
    } catch (err) {
      if (handleAuthFailure(err)) return;

      toast.error(
        statusTarget.action === "deactivate"
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
        setStatusTarget(null);
        await load();
      }
    } finally {
      setStatusPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <section
        className={glassCardClass(
          "relative overflow-hidden p-6 sm:p-8"
        )}
      >
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
                Platform · Directory
              </p>
              <span className="rounded-full border border-border/60 bg-surface-raised/70 px-2 py-0.5 font-mono text-[0.62rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:border-white/10 dark:bg-white/[0.04] dark:text-sky-300/75">
                Account control
              </span>
            </div>

            <h1 className="mt-2 text-balance bg-gradient-to-r from-sea-800 via-sea-600 to-sea-400 bg-clip-text font-display text-h2 font-semibold text-transparent dark:from-sea-300 dark:via-sky-200 dark:to-white">
              User management
            </h1>
            <p className="mt-3 max-w-2xl text-pretty text-body-sm text-muted-foreground dark:text-sky-300/75">
              Search every Lumina account, inspect customer and business context,
              and suspend or restore access without leaving the console.
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
                onClick={() => void load()}
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
                Accounts
              </p>
              <p className="mt-1 font-display text-xl font-semibold tabular-nums text-foreground">
                {state === "error" && users.length === 0
                  ? "—"
                  : formatUserCount(meta.total)}
              </p>
            </div>
            <div>
              <p className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-sky-400/60">
                Active here
              </p>
              <p className="mt-1 font-display text-xl font-semibold tabular-nums text-success">
                {showSkeleton ? "—" : formatUserCount(activeOnPage)}
              </p>
            </div>
            <div>
              <p className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-sky-400/60">
                Suspended
              </p>
              <p className="mt-1 font-display text-xl font-semibold tabular-nums text-red-700 dark:text-red-200">
                {showSkeleton ? "—" : formatUserCount(suspendedOnPage)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-label="Account filters"
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
              placeholder="Search name or email…"
              aria-label="Search accounts by name or email"
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
              aria-label="Filter accounts by role"
              className="flex flex-wrap items-center gap-1.5"
            >
              {roleFilters.map((filter) => {
                const Icon = filter.icon;
                const active = role === filter.value;

                return (
                  <button
                    key={filter.value || "all"}
                    type="button"
                    onClick={() => {
                      setRole(filter.value);
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

            <div className="relative">
              <ArrowDownUp
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground dark:text-sky-400/60"
              />
              <select
                value={sortValue}
                onChange={(event) => {
                  setSortValue(event.target.value as SortValue);
                  setPage(1);
                }}
                aria-label="Sort accounts"
                className="h-9 w-full appearance-none rounded-xl border border-border/70 bg-surface-raised/60 pl-8 pr-8 text-caption font-medium text-foreground outline-none transition-[border-color,box-shadow] focus:border-sea-500/60 focus:ring-2 focus:ring-sea-500/20 dark:border-white/10 dark:bg-white/[0.04] dark:focus:border-sea-300/45 dark:focus:ring-sea-300/15 sm:w-auto"
              >
                {Object.entries(sortConfig).map(([value, option]) => (
                  <option key={value} value={value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronRight
                aria-hidden="true"
                className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 rotate-90 text-muted-foreground dark:text-sky-400/60"
              />
            </div>
          </div>
        </div>
      </section>

      {state === "error" && users.length > 0 && (
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
                Account directory unavailable
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

      <section
        aria-label="Accounts"
        aria-busy={state === "loading"}
        className={glassCardClass("min-h-[22rem] p-0")}
      >
        <div className="flex flex-col gap-2 border-b border-border/55 px-4 py-3 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-title font-semibold text-foreground">
              Accounts
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
              ? "Loading accounts…"
              : state === "error" && users.length === 0
                ? "Directory unavailable"
                : meta.total === 0
                  ? "No accounts found"
                  : `Showing ${start}–${end} of ${formatUserCount(meta.total)}`}
          </p>
        </div>

        {showSkeleton ? (
          <div className="space-y-2 p-4 sm:p-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-[4.5rem] animate-pulse rounded-xl bg-muted/55 dark:bg-white/[0.055]"
              />
            ))}
          </div>
        ) : state === "error" && users.length === 0 ? (
          <div className="grid min-h-[18rem] place-items-center px-6 py-12 text-center">
            <div className="max-w-sm">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-200">
                <AlertTriangle aria-hidden="true" className="size-5" />
              </span>
              <h3 className="mt-4 font-display text-title font-semibold text-foreground">
                Account directory unavailable
              </h3>
              <p className="mt-1.5 text-body-sm text-muted-foreground dark:text-sky-300/70">
                {error}
              </p>
              <button
                type="button"
                onClick={() => void load()}
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
        ) : users.length === 0 ? (
          <div className="grid min-h-[18rem] place-items-center px-6 py-12 text-center">
            <div className="max-w-sm">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-sea-500/20 bg-sea-500/10 text-sea-700 dark:border-sea-300/20 dark:bg-sea-400/10 dark:text-sea-200">
                <Users aria-hidden="true" className="size-5" />
              </span>
              <h3 className="mt-4 font-display text-title font-semibold text-foreground">
                {hasFilters ? "No matching accounts" : "No accounts yet"}
              </h3>
              <p className="mt-1.5 text-body-sm text-muted-foreground dark:text-sky-300/70">
                {hasFilters
                  ? "Try a different name, email, or role filter. Your search is applied across the whole directory."
                  : "Customer and business accounts will appear here as soon as they register."}
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
              <table className="w-full min-w-[68rem] text-left">
                <caption className="sr-only">
                  Lumina accounts, including role, status, activity, and account
                  controls
                </caption>
                <thead>
                  <tr className="border-b border-border/55 bg-surface-raised/35 text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground dark:border-white/10 dark:bg-white/[0.025] dark:text-sky-400/60">
                    <th scope="col" className="px-5 py-2.5 font-medium">
                      Account
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Role
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Activity
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Joined
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Last sign-in
                    </th>
                    <th scope="col" className="px-5 py-2.5 text-right font-medium">
                      Manage
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/45 dark:divide-white/[0.07]">
                  {users.map((user) => {
                    const isSelf = user.id === currentUserId;

                    return (
                      <tr
                        key={user.id}
                        className="group transition-colors hover:bg-surface-raised/40 dark:hover:bg-white/[0.025]"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex min-w-0 items-center gap-3">
                            <AccountAvatar user={user} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="truncate text-body-sm font-medium text-foreground">
                                  {getUserName(user)}
                                </p>
                                {user.emailVerified ? (
                                  <CheckCircle2
                                    aria-label="Email verified"
                                    className="size-3.5 shrink-0 text-success"
                                  />
                                ) : (
                                  <AlertCircle
                                    aria-label="Email not verified"
                                    className="size-3.5 shrink-0 text-amber-600 dark:text-amber-300"
                                  />
                                )}
                                {isSelf && (
                                  <span className="rounded-full bg-sea-500/10 px-1.5 py-0.5 font-mono text-[0.55rem] font-medium uppercase tracking-[0.1em] text-sea-700 dark:bg-sea-400/10 dark:text-sea-200">
                                    You
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 truncate text-caption text-muted-foreground dark:text-sky-300/70">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5">
                          <RoleBadge role={user.role} />
                        </td>
                        <td className="px-3 py-3.5">
                          <StatusBadge isActive={user.isActive} />
                        </td>
                        <td className="max-w-[13rem] px-3 py-3.5">
                          <ActivitySummary user={user} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-caption text-muted-foreground dark:text-sky-300/70">
                          {formatUserDate(user.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5">
                          <span
                            title={formatUserDateTime(user.lastLoginAt)}
                            className="text-caption text-muted-foreground dark:text-sky-300/70"
                          >
                            {formatUserRelativeTime(user.lastLoginAt)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/admin/users/${user.id}`}
                              onMouseEnter={() => prefetchUser(user.id)}
                              onFocus={() => prefetchUser(user.id)}
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
                            <button
                              type="button"
                              onClick={() => openStatusDialog(user)}
                              disabled={isSelf}
                              title={
                                isSelf
                                  ? "You cannot change your own account status"
                                  : user.isActive
                                    ? `Suspend ${getUserName(user)}`
                                    : `Restore ${getUserName(user)}`
                              }
                              className={cn(
                                "inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500/60 disabled:cursor-not-allowed disabled:opacity-40 dark:focus-visible:ring-sea-300/60",
                                user.isActive
                                  ? "border-red-500/20 text-red-700 hover:border-red-500/35 hover:bg-red-500/10 dark:border-red-300/20 dark:text-red-200 dark:hover:border-red-300/35 dark:hover:bg-red-400/10"
                                  : "border-green-700/25 text-success hover:border-green-700/40 hover:bg-green-700/10 dark:border-green-300/20 dark:hover:border-green-300/35 dark:hover:bg-green-300/10"
                              )}
                            >
                              {user.isActive ? (
                                <UserX aria-hidden="true" className="size-3.5" />
                              ) : (
                                <UserCheck
                                  aria-hidden="true"
                                  className="size-3.5"
                                />
                              )}
                              {user.isActive ? "Suspend" : "Restore"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-border/45 dark:divide-white/[0.07] lg:hidden">
              {users.map((user) => {
                const isSelf = user.id === currentUserId;

                return (
                  <article key={user.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <AccountAvatar user={user} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate text-body-sm font-medium text-foreground">
                            {getUserName(user)}
                          </p>
                          {isSelf && (
                            <span className="rounded-full bg-sea-500/10 px-1.5 py-0.5 font-mono text-[0.55rem] font-medium uppercase tracking-[0.1em] text-sea-700 dark:bg-sea-400/10 dark:text-sea-200">
                              You
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-caption text-muted-foreground dark:text-sky-300/70">
                          {user.email}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <RoleBadge role={user.role} />
                          <StatusBadge isActive={user.isActive} />
                        </div>
                      </div>
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-border/50 bg-surface-raised/35 p-2.5 dark:border-white/10 dark:bg-white/[0.025]">
                      <div>
                        <dt className="font-mono text-[0.56rem] font-medium uppercase tracking-[0.12em] text-muted-foreground dark:text-sky-400/55">
                          Activity
                        </dt>
                        <dd className="mt-0.5">
                          <ActivitySummary user={user} />
                        </dd>
                      </div>
                      <div>
                        <dt className="font-mono text-[0.56rem] font-medium uppercase tracking-[0.12em] text-muted-foreground dark:text-sky-400/55">
                          Last sign-in
                        </dt>
                        <dd
                          title={formatUserDateTime(user.lastLoginAt)}
                          className="mt-0.5 text-caption text-muted-foreground dark:text-sky-300/70"
                        >
                          {formatUserRelativeTime(user.lastLoginAt)}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-mono text-[0.56rem] font-medium uppercase tracking-[0.12em] text-muted-foreground dark:text-sky-400/55">
                          Joined
                        </dt>
                        <dd className="mt-0.5 text-caption text-muted-foreground dark:text-sky-300/70">
                          {formatUserDate(user.createdAt)}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-mono text-[0.56rem] font-medium uppercase tracking-[0.12em] text-muted-foreground dark:text-sky-400/55">
                          Email
                        </dt>
                        <dd className="mt-0.5 inline-flex items-center gap-1 text-caption text-muted-foreground dark:text-sky-300/70">
                          {user.emailVerified ? (
                            <>
                              <CheckCircle2
                                aria-hidden="true"
                                className="size-3.5 text-success"
                              />
                              Verified
                            </>
                          ) : (
                            <>
                              <AlertCircle
                                aria-hidden="true"
                                className="size-3.5 text-amber-600 dark:text-amber-300"
                              />
                              Unverified
                            </>
                          )}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-3 flex items-center gap-2">
                      <Link
                        href={`/admin/users/${user.id}`}
                        onMouseEnter={() => prefetchUser(user.id)}
                        onFocus={() => prefetchUser(user.id)}
                        className={buttonClass({
                          variant: "outline",
                          size: "sm",
                          className: "flex-1",
                        })}
                      >
                        Open profile
                        <ArrowUpRight
                          aria-hidden="true"
                          className="size-3.5"
                        />
                      </Link>
                      <button
                        type="button"
                        onClick={() => openStatusDialog(user)}
                        disabled={isSelf}
                        title={
                          isSelf
                            ? "You cannot change your own account status"
                            : user.isActive
                              ? `Suspend ${getUserName(user)}`
                              : `Restore ${getUserName(user)}`
                        }
                        className={cn(
                          "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500/60 disabled:cursor-not-allowed disabled:opacity-40 dark:focus-visible:ring-sea-300/60",
                          user.isActive
                            ? "border-red-500/20 text-red-700 hover:border-red-500/35 hover:bg-red-500/10 dark:border-red-300/20 dark:text-red-200 dark:hover:border-red-300/35 dark:hover:bg-red-400/10"
                            : "border-green-700/25 text-success hover:border-green-700/40 hover:bg-green-700/10 dark:border-green-300/20 dark:hover:border-green-300/35 dark:hover:bg-green-300/10"
                        )}
                      >
                        {user.isActive ? (
                          <UserX aria-hidden="true" className="size-3.5" />
                        ) : (
                          <UserCheck aria-hidden="true" className="size-3.5" />
                        )}
                        {user.isActive ? "Suspend" : "Restore"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        <AdminPagination
          page={page}
          totalPages={meta.totalPages}
          total={meta.total}
          pageSize={PAGE_SIZE}
          loading={state === "loading"}
          itemLabel="accounts"
          onPageChange={setPage}
        />
      </section>

      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-label text-muted-foreground dark:text-sky-400/60">
        <span>
          Source: <code className="font-mono">GET /api/v1/admin/users</code>
        </span>
        <span aria-hidden="true">·</span>
        <span>Search, role, sort, and pagination are server-backed</span>
      </p>

      <UserStatusDialog
        open={Boolean(statusTarget)}
        action={statusTarget?.action ?? "deactivate"}
        displayName={statusTarget ? getUserName(statusTarget.user) : ""}
        email={statusTarget?.user.email ?? ""}
        role={statusTarget?.user.role ?? "CUSTOMER"}
        pending={statusPending}
        onCancel={() => {
          if (!statusPending) setStatusTarget(null);
        }}
        onConfirm={(reason) => void confirmStatus(reason)}
      />
    </div>
  );
}
