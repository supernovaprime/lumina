"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { adminNavSections } from "@/components/dashboard/admin-nav";
import { LogoutConfirmDialog } from "@/components/dashboard/LogoutConfirmDialog";
import { BrandMark } from "@/components/brand/BrandMark";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { buttonClass } from "@/components/ui/button";
import { glassCardClass } from "@/components/ui/glass-card";
import { clearSession, getSession, type AuthSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

function initialsFrom(value: string): string {
  const [local] = value.split("@");
  const parts = local.split(/[._-]+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return local.slice(0, 2).toUpperCase();
}

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [checking, setChecking] = useState(true);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  useEffect(() => {
    const current = getSession();

    if (!current) {
      router.replace("/login");
      return;
    }

    if (current.user.role !== "ADMIN") {
      toast.error("Admin access required", {
        description: "That area is reserved for platform administrators.",
      });
      router.replace("/");
      return;
    }

    setSession(current);
    setChecking(false);
  }, [router]);

  const handleSignOut = useCallback(() => {
    clearSession();
    setConfirmingSignOut(false);
    toast.success("Signed out", {
      description: "You have been securely signed out of the admin console.",
    });
    router.replace("/login");
  }, [router]);

  const handleCancelSignOut = useCallback(() => {
    setConfirmingSignOut(false);
  }, []);

  const isActive = (href: string) =>
    href === "/admin"
      ? pathname === "/admin"
      : pathname === href || pathname.startsWith(`${href}/`);

  if (checking) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid size-12 place-items-center rounded-2xl border border-border/60 bg-surface-raised/70 text-sea-600 shadow-[0_20px_50px_-32px_rgba(4,28,40,0.55)] dark:border-white/10 dark:bg-white/[0.05] dark:text-sea-300">
            <Loader2 aria-hidden="true" className="size-5 animate-spin" />
          </span>
          <p className="font-mono text-label uppercase tracking-[0.18em] text-muted-foreground dark:text-sky-400/70">
            Verifying admin session
          </p>
        </div>
      </div>
    );
  }

  const email = session?.user.email ?? "administrator@lumina";
  const navItems = adminNavSections.flatMap((section) => section.items);

  return (
    <div className="relative min-h-dvh overflow-x-clip bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-10 size-[26rem] rounded-full bg-sea-300/30 blur-3xl dark:bg-sea-500/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 top-1/3 size-[24rem] rounded-full bg-sky-300/25 blur-3xl dark:bg-sky-400/10"
      />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-[var(--container-page)] flex-col px-2 py-2 sm:px-3 sm:py-3 lg:px-4 lg:py-4">
        <header className="sticky top-2 z-40 sm:top-3 lg:top-4">
          <div className="header-gradient-ring relative flex items-center justify-between gap-3 overflow-hidden rounded-2xl bg-white/60 px-4 py-3 shadow-[0_24px_70px_-42px_rgba(4,28,40,0.55),inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-3xl backdrop-saturate-150 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/80 before:to-transparent dark:bg-sea-950/65 dark:shadow-[0_30px_80px_-48px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.1)] dark:before:via-white/20 sm:rounded-[1.25rem] sm:px-5 sm:py-3.5">
            <div className="relative z-10 flex min-w-0 items-center gap-3">
              <BrandMark />
              <span className="hidden h-7 w-px bg-border/70 dark:bg-white/10 sm:block" />
              <span className="hidden items-center gap-1.5 rounded-full border border-sea-500/25 bg-sea-500/10 px-2.5 py-1 font-mono text-[0.65rem] font-medium uppercase tracking-[0.16em] text-sea-700 dark:border-sea-300/25 dark:bg-sea-400/10 dark:text-sea-200 sm:inline-flex">
                <ShieldCheck aria-hidden="true" className="size-3" />
                Admin
              </span>
            </div>

            <div className="relative z-10 flex items-center gap-2">
              <ThemeToggle />
              <button
                type="button"
                onClick={() => setConfirmingSignOut(true)}
                aria-label="Sign out of the admin console"
                className={buttonClass({
                  variant: "gradientOutline",
                  size: "icon",
                  className: "text-muted-foreground hover:text-foreground",
                })}
              >
                <LogOut aria-hidden="true" className="size-4" />
              </button>
            </div>
          </div>
        </header>

        <div className="mt-3 grid flex-1 gap-3 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 flex flex-col gap-3">
              <nav aria-label="Admin sections" className={glassCardClass("p-2")}>
                {adminNavSections.map((section) => (
                  <div key={section.label} className="py-1">
                    <p className="px-2.5 pb-1 pt-1.5 font-mono text-[0.62rem] font-medium uppercase tracking-[0.18em] text-muted-foreground/80 dark:text-sky-400/60">
                      {section.label}
                    </p>
                    <div className="space-y-0.5">
                      {section.items.map((item) => {
                        const active = isActive(item.href);
                        const Icon = item.icon;

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "group relative flex items-start gap-2.5 rounded-xl px-2.5 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500/60 dark:focus-visible:ring-sea-300/60",
                              active
                                ? "bg-sea-500/[0.12] text-foreground dark:bg-sea-400/10 dark:text-paper"
                                : "text-muted-foreground hover:bg-surface-raised/70 hover:text-foreground dark:hover:bg-white/[0.05] dark:hover:text-paper"
                            )}
                          >
                            <span
                              className={cn(
                                "mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border transition-colors",
                                active
                                  ? "border-sea-500/30 bg-sea-500/[0.15] text-sea-700 dark:border-sea-300/25 dark:bg-sea-400/10 dark:text-sea-200"
                                  : "border-border/60 bg-surface-raised/60 text-muted-foreground dark:border-white/10 dark:bg-white/[0.04]"
                              )}
                            >
                              <Icon aria-hidden="true" className="size-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-body-sm font-medium">
                                {item.label}
                              </span>
                              <span className="mt-0.5 block text-label leading-snug text-muted-foreground/80 dark:text-sky-400/60">
                                {item.description}
                              </span>
                            </span>
                            {active && (
                              <span
                                aria-hidden="true"
                                className="mt-1.5 h-6 w-1 shrink-0 rounded-full bg-gradient-to-b from-sea-400 to-sky-400"
                              />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>

              <div className={glassCardClass("flex items-center gap-2.5 p-3")}>
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sea-400 via-sea-500 to-sky-500 text-[0.7rem] font-semibold text-white shadow-[0_0_22px_-8px_rgba(14,180,243,0.8)]">
                  {initialsFrom(email)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-caption font-medium text-foreground">
                    {email}
                  </span>
                  <span className="block text-label text-muted-foreground dark:text-sky-400/70">
                    Administrator
                  </span>
                </span>
              </div>
            </div>
          </aside>

          <div className="flex min-w-0 flex-col gap-3">
            <nav aria-label="Admin sections" className="lg:hidden">
              <div className="no-scrollbar flex gap-1.5 overflow-x-auto rounded-2xl border border-border/60 bg-surface-raised/70 p-1.5 shadow-[0_18px_48px_-38px_rgba(4,28,40,0.5)] backdrop-blur-xl dark:border-white/10 dark:bg-sea-950/60">
                {navItems.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500/60 dark:focus-visible:ring-sea-300/60",
                        active
                          ? "bg-sea-500/[0.15] text-sea-800 dark:bg-sea-400/[0.15] dark:text-sea-100"
                          : "text-muted-foreground hover:bg-surface-raised hover:text-foreground dark:hover:bg-white/[0.06] dark:hover:text-paper"
                      )}
                    >
                      <Icon aria-hidden="true" className="size-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </nav>

            <main className="min-w-0 flex-1">{children}</main>

            <footer className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1 pb-1 text-label text-muted-foreground dark:text-sky-400/60">
              <span>Lumina admin console · v1.0.0</span>
              <span className="font-mono uppercase tracking-[0.14em]">
                Secure session · {email}
              </span>
            </footer>
          </div>
        </div>
      </div>

      <LogoutConfirmDialog
        open={confirmingSignOut}
        email={email}
        onCancel={handleCancelSignOut}
        onConfirm={handleSignOut}
      />
    </div>
  );
}
