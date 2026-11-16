"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { AdminCarWatermark } from "@/components/dashboard/AdminCarWatermark";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { adminToolkit } from "@/components/dashboard/admin-nav";
import { buttonClass } from "@/components/ui/button";
import { Confetti, type ConfettiRef } from "@/components/ui/confetti";
import { glassCardClass } from "@/components/ui/glass-card";
import {
  ApiError,
  getAdminDashboard,
  type AdminDashboardMetrics,
} from "@/lib/api";
import {
  clearAdminWelcome,
  clearSession,
  getSession,
  shouldWelcomeAdmin,
  type AuthSession,
} from "@/lib/auth";
import { cn } from "@/lib/utils";

type LoadState = "loading" | "ready" | "error";

const countFormatter = new Intl.NumberFormat("en-US");

function formatCount(value: number): string {
  return countFormatter.format(value);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    currencyDisplay: "narrowSymbol",
    notation: value >= 10000 ? "compact" : "standard",
    maximumFractionDigits: value >= 10000 ? 1 : 2,
  }).format(value);
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const heroRef = useRef<HTMLElement>(null);
  const reportRef = useRef<HTMLAnchorElement>(null);
  const confettiRef = useRef<ConfettiRef>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    setError("");

    try {
      const result = await getAdminDashboard();
      setMetrics(result);
      setUpdatedAt(new Date());
      setState("ready");
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        clearSession();
        toast.error(
          err.status === 401 ? "Session expired" : "Admin access required",
          {
            description:
              err.status === 401
                ? "Please sign in again to continue to the admin console."
                : "Your account no longer has admin access.",
          }
        );
        router.replace("/login");
        return;
      }

      setError(
        err instanceof ApiError
          ? err.message
          : "We couldn't load the platform metrics."
      );
      setState("error");
    }
  }, [router]);

  useEffect(() => {
    setSession(getSession());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    if (!shouldWelcomeAdmin()) return;

    const colors = ["#0eb4f3", "#72d9ff", "#f7c948", "#fde68a", "#ffffff"];
    const timers = [
      window.setTimeout(() => {
        const instance = confettiRef.current;
        if (!instance) return;

        clearAdminWelcome();
        instance.fire({
          particleCount: 70,
          spread: 70,
          startVelocity: 42,
          decay: 0.92,
          gravity: 0.9,
          ticks: 160,
          scalar: 0.9,
          colors,
          origin: { x: 0.18, y: 0.42 },
        });
        instance.fire({
          particleCount: 70,
          spread: 70,
          startVelocity: 42,
          decay: 0.92,
          gravity: 0.9,
          ticks: 160,
          scalar: 0.9,
          colors,
          origin: { x: 0.82, y: 0.42 },
        });
      }, 350),
      window.setTimeout(() => {
        confettiRef.current?.fire({
          particleCount: 55,
          spread: 100,
          startVelocity: 36,
          decay: 0.94,
          gravity: 0.85,
          ticks: 140,
          scalar: 0.85,
          colors,
          origin: { x: 0.5, y: 0.3 },
        });
      }, 610),
    ];

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date()),
    []
  );

  const customer = session?.customer as
    | { firstName?: string; lastName?: string }
    | null
    | undefined;
  const displayName =
    customer?.firstName?.trim() ||
    session?.user.email?.split("@")[0] ||
    "Administrator";

  const bookingsToday = metrics?.bookingsToday ?? 0;
  const revenue = Number(metrics?.revenueMTD ?? 0);
  const activeBusinesses = metrics?.activeBusinesses ?? 0;
  const pendingVerifications = metrics?.pendingVerifications ?? 0;
  const totalUsers = metrics?.totalUsers ?? 0;
  const isLoading = state === "loading";

  return (
    <div className="space-y-3">
      <section
        ref={heroRef}
        className={glassCardClass("relative overflow-hidden p-6 sm:p-8")}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-sea-400/20 blur-3xl dark:bg-sea-500/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-1/3 size-56 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-400/10"
        />
        <AdminCarWatermark containerRef={heroRef} parkingRef={reportRef} />
        <Confetti ref={confettiRef} className="z-0" />

        <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.55fr)] lg:items-center lg:gap-8">
          <div className="relative order-1 flex justify-center lg:justify-start">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-4 inset-y-6 rounded-full bg-gradient-to-br from-sea-300/35 via-sky-200/25 to-transparent blur-2xl dark:from-sea-500/20 dark:via-sky-500/10"
            />
            <Image
              src="/assets/Onboarding-cuate.svg"
              alt=""
              width={750}
              height={500}
              priority
              unoptimized
              className="relative h-auto w-full max-w-[17rem] drop-shadow-[0_28px_48px_-28px_rgba(4,28,40,0.4)] sm:max-w-[21rem] lg:max-w-[24rem] dark:drop-shadow-[0_28px_56px_-28px_rgba(0,0,0,0.7)]"
            />
          </div>

          <div className="order-2 min-w-0">
            <div className="max-w-2xl">
              <p className="font-mono text-label font-medium uppercase tracking-[0.18em] text-sea-700 dark:text-sea-300">
                Platform overview
              </p>
              <h1 className="mt-2 text-balance bg-gradient-to-r from-sea-800 via-sea-600 to-sea-400 bg-clip-text font-display text-h1 font-semibold text-transparent dark:from-sea-300 dark:via-sky-200 dark:to-white">
                Welcome back, {displayName}.
              </h1>
              <p className="mt-3 max-w-xl text-pretty text-body-sm text-muted-foreground dark:text-sky-300/75">
                Here is the pulse of Lumina today — bookings, revenue, partners,
                and the queues that need an admin&apos;s eye.
              </p>
              <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface-raised/60 px-3 py-1.5 text-label text-muted-foreground dark:border-white/10 dark:bg-white/[0.04] dark:text-sky-300/75">
                <CalendarDays aria-hidden="true" className="size-3.5" />
                {todayLabel}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Link
                href="/admin/businesses?status=PENDING"
                className={buttonClass({
                  variant: "gradient",
                  size: "default",
                  className: "group",
                })}
              >
                Review verifications
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </Link>
              <Link
                ref={reportRef}
                href="/admin/reports"
                className={buttonClass({ variant: "gradientOutline", size: "default" })}
              >
                Generate report
              </Link>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border/50 pt-4 text-label text-muted-foreground dark:border-white/10 dark:text-sky-400/70">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck
              aria-hidden="true"
              className="size-3.5 text-sea-600 dark:text-sea-300"
            />
            Signed in as {session?.user.email ?? "admin"}
          </span>
          <span className="hidden h-3 w-px bg-border/70 dark:bg-white/10 sm:block" />
          <button
            type="button"
            onClick={() => void load()}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors hover:bg-surface hover:text-foreground disabled:opacity-60 dark:hover:bg-white/[0.06]"
          >
            <RefreshCw
              aria-hidden="true"
              className={cn("size-3.5", isLoading && "animate-spin")}
            />
            Refresh metrics
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
      </section>

      <section aria-labelledby="platform-metrics">
        <h2 id="platform-metrics" className="sr-only">
          Platform metrics
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <MetricCard
            label="Bookings today"
            value={metrics ? formatCount(bookingsToday) : "—"}
            hint="Created since midnight"
            icon={CalendarDays}
            tone="sea"
            href="/admin/bookings"
            loading={isLoading}
          />
          <MetricCard
            label="Revenue MTD"
            value={metrics ? formatCurrency(revenue) : "—"}
            hint="Completed payments · GHS"
            icon={Wallet}
            tone="success"
            loading={isLoading}
          />
          <MetricCard
            label="Active businesses"
            value={metrics ? formatCount(activeBusinesses) : "—"}
            hint="Verified and live"
            icon={Store}
            tone="sky"
            href="/admin/businesses"
            loading={isLoading}
          />
          <MetricCard
            label="Pending verifications"
            value={metrics ? formatCount(pendingVerifications) : "—"}
            hint={
              metrics
                ? pendingVerifications > 0
                  ? "Awaiting review"
                  : "Queue is clear"
                : "Unavailable"
            }
            icon={ShieldCheck}
            tone={metrics && pendingVerifications > 0 ? "warning" : "sea"}
            href="/admin/businesses?status=PENDING"
            loading={isLoading}
          />
          <MetricCard
            label="Active users"
            value={metrics ? formatCount(totalUsers) : "—"}
            hint="Customer and business accounts"
            icon={Users}
            tone="sea"
            href="/admin/users"
            loading={isLoading}
          />
        </div>
      </section>

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
                Metrics are temporarily unavailable
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

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <section className={glassCardClass("flex flex-col p-5 sm:p-6")}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-title font-semibold text-foreground">
                Needs attention
              </h2>
              <p className="mt-1 text-caption text-muted-foreground dark:text-sky-300/70">
                The live queue that benefits most from an admin decision.
              </p>
            </div>
            <span className="rounded-full border border-border/60 bg-surface-raised/70 px-2.5 py-1 font-mono text-[0.62rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:border-white/10 dark:bg-white/[0.04] dark:text-sky-300/75">
              Live
            </span>
          </div>

          {isLoading && !metrics ? (
            <div className="mt-4 space-y-2.5">
              <div className="h-24 animate-pulse rounded-xl bg-muted/70 dark:bg-white/[0.06]" />
              <div className="h-14 animate-pulse rounded-xl bg-muted/50 dark:bg-white/[0.04]" />
            </div>
          ) : !metrics ? (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-border/60 bg-surface-raised/50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sea-500/10 text-sea-700 dark:bg-sea-400/10 dark:text-sea-200">
                <AlertTriangle aria-hidden="true" className="size-4" />
              </span>
              <div>
                <p className="text-body-sm font-medium text-foreground">
                  Verification queue unavailable
                </p>
                <p className="mt-0.5 text-caption text-muted-foreground dark:text-sky-300/70">
                  Refresh the metrics to load the current partner queue.
                </p>
              </div>
            </div>
          ) : pendingVerifications > 0 ? (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 dark:border-amber-300/25 dark:bg-amber-300/[0.06]">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300">
                <AlertTriangle aria-hidden="true" className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-body-sm font-medium text-foreground">
                  {pendingVerifications} business
                  {pendingVerifications === 1 ? "" : "es"} awaiting verification
                </p>
                <p className="mt-0.5 text-caption text-muted-foreground dark:text-sky-300/70">
                  Review partner details and approve or reject them from the
                  verification queue.
                </p>
                <Link
                  href="/admin/businesses?status=PENDING"
                  className={buttonClass({
                    variant: "gradient",
                    size: "sm",
                    className: "group mt-3",
                  })}
                >
                  Open queue
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-green-700/25 bg-green-700/10 p-4 dark:border-green-300/20 dark:bg-green-300/[0.06]">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-green-700/10 text-success dark:bg-green-300/10">
                <CheckCircle2 aria-hidden="true" className="size-4" />
              </span>
              <div>
                <p className="text-body-sm font-medium text-foreground">
                  Verification queue is clear
                </p>
                <p className="mt-0.5 text-caption text-muted-foreground dark:text-sky-300/70">
                  Every partner business has been reviewed. New applications
                  will appear here.
                </p>
              </div>
            </div>
          )}

          <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-border/50 pt-4 dark:border-white/10">
            <div>
              <dt className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-sky-400/60">
                Bookings
              </dt>
              <dd className="mt-1 font-display text-xl font-semibold tabular-nums text-foreground">
                {!metrics ? "—" : formatCount(bookingsToday)}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-sky-400/60">
                Live partners
              </dt>
              <dd className="mt-1 font-display text-xl font-semibold tabular-nums text-foreground">
                {!metrics ? "—" : formatCount(activeBusinesses)}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:text-sky-400/60">
                Users
              </dt>
              <dd className="mt-1 font-display text-xl font-semibold tabular-nums text-foreground">
                {!metrics ? "—" : formatCount(totalUsers)}
              </dd>
            </div>
          </dl>
        </section>

        <section className={glassCardClass("flex flex-col p-5 sm:p-6")}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-title font-semibold text-foreground">
                Admin toolkit
              </h2>
              <p className="mt-1 text-caption text-muted-foreground dark:text-sky-300/70">
                Jump straight into the console&apos;s working surfaces.
              </p>
            </div>
            <span className="rounded-full border border-border/60 bg-surface-raised/70 px-2.5 py-1 font-mono text-[0.62rem] font-medium uppercase tracking-[0.14em] text-muted-foreground dark:border-white/10 dark:bg-white/[0.04] dark:text-sky-300/75">
              {adminToolkit.length} areas
            </span>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {adminToolkit.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-start gap-2.5 rounded-xl border border-border/50 bg-surface-raised/45 p-3 transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-sea-500/35 hover:bg-surface-raised/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500/60 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-sea-300/30 dark:focus-visible:ring-sea-300/60"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-sea-500/20 bg-sea-500/10 text-sea-700 dark:border-sea-300/20 dark:bg-sea-400/10 dark:text-sea-200">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2 text-body-sm font-medium text-foreground">
                      {item.label}
                      <ArrowUpRight
                        aria-hidden="true"
                        className="size-3.5 text-muted-foreground/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                      />
                    </span>
                    <span className="mt-0.5 block text-label leading-snug text-muted-foreground dark:text-sky-400/65">
                      {item.description}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-label text-muted-foreground dark:text-sky-400/60">
        <span>
          Source: <code className="font-mono">GET /api/v1/admin/dashboard</code>
        </span>
        <span aria-hidden="true">·</span>
        <span>server-cached for 60 seconds</span>
      </p>
    </div>
  );
}
