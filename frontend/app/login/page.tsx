import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { AuthCard } from "@/components/auth/AuthCard";
import { BrandMark } from "@/components/brand/BrandMark";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Log in",
  description:
    "Log in to your Lumina account or create a new account to book trusted car washes around Accra.",
};

export default function LoginPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-background px-2 py-2 sm:px-3 sm:py-3 lg:px-4 lg:py-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 top-1/4 size-[30rem] rounded-full bg-sea-300/35 blur-3xl dark:bg-sea-500/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 bottom-0 size-[28rem] rounded-full bg-sky-300/30 blur-3xl dark:bg-sky-400/10"
      />

      <div className="relative mx-auto flex min-h-[calc(100dvh-1rem)] w-full max-w-[var(--container-page)] flex-col sm:min-h-[calc(100dvh-1.5rem)] lg:min-h-[calc(100dvh-2rem)]">
        <h1 className="sr-only">Log in to or create your Lumina account</h1>

        <header className="flex items-center justify-between gap-3 px-1 py-1 sm:px-2">
          <BrandMark />
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className={buttonClass({
                variant: "ghost",
                size: "sm",
                className: "h-10 text-muted-foreground hover:text-foreground",
              })}
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">Back home</span>
              <span className="sm:hidden">Back</span>
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center py-6 sm:py-8 lg:py-10">
          <AuthCard />
        </div>

        <p className="flex items-center justify-center gap-1.5 pb-2 text-center text-caption text-muted-foreground dark:text-sky-400/70">
          <ShieldCheck aria-hidden="true" className="size-3.5" />
          Secure by default. Made in Accra.
        </p>
      </div>
    </main>
  );
}
