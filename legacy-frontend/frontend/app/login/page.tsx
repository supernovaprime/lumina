import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { LoginVisual } from "@/components/auth/LoginVisual";
import { BrandMark } from "@/components/brand/BrandMark";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export const metadata: Metadata = {
  title: "Log In",
  description:
    "Sign in to Lumina to manage car wash bookings, save favourites, and see prices up front in Accra.",
};

export default function LoginPage() {
  return (
    <main className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-[#f7f5ec] dark:bg-[#071a20]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(75%_80%_at_100%_0%,rgba(10,147,150,0.14),transparent_60%),radial-gradient(80%_80%_at_0%_100%,rgba(238,155,0,0.12),transparent_62%),linear-gradient(125deg,#f6f5ec_0%,#eef4ef_48%,#f4f1e7_100%)] dark:hidden" />
        <div className="absolute inset-0 hidden bg-[linear-gradient(135deg,#04161b_0%,#062a31_45%,#0b4a4d_100%)] dark:block" />
        <div className="absolute -left-32 top-8 size-[36rem] rounded-full bg-teal-400/20 blur-3xl dark:bg-teal-500/10" />
        <div className="absolute -right-24 bottom-0 size-[32rem] rounded-full bg-gold-300/20 blur-3xl dark:bg-gold-500/10" />
        <div className="absolute left-1/2 top-1/2 size-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30 dark:border-white/5" />
        <div className="absolute -left-12 top-24 size-40 rotate-12 rounded-[2.5rem] border border-white/40 bg-white/30 blur-2xl dark:border-white/10 dark:bg-white/[0.03]" />
        <div className="absolute -right-12 bottom-24 size-52 -rotate-12 rounded-[3rem] border border-white/40 bg-white/20 blur-2xl dark:border-white/10 dark:bg-white/[0.03]" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-12 xl:px-20">
        <Link
          href="/"
          aria-label="Lumina home"
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/50 dark:focus-visible:ring-teal-300/50"
        >
          <BrandMark tagline={false} />
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="hidden items-center gap-2 rounded-full border border-white/60 bg-white/40 px-4 py-2.5 text-caption font-medium text-navy-800 shadow-[0_8px_24px_-16px_rgba(0,18,25,0.3)] backdrop-blur-xl transition-colors hover:bg-white/70 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/50 dark:border-white/10 dark:bg-white/[0.06] dark:text-teal-200 dark:hover:bg-white/10 dark:hover:text-teal-100 dark:focus-visible:ring-teal-300/50 sm:inline-flex"
          >
            <ArrowLeft aria-hidden="true" className="size-3.5" />
            Back to home
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 pb-8 pt-2 sm:px-6 lg:px-8">
        <div className="grid w-full max-w-[1180px] overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/65 shadow-[0_40px_120px_-48px_rgba(0,18,25,0.55)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_50px_140px_-50px_rgba(0,0,0,0.9)] sm:rounded-[2rem] lg:grid-cols-[1.08fr_0.92fr]">
          <LoginVisual className="min-h-[13rem] sm:min-h-[15rem] lg:min-h-[660px]" />

          <div className="relative flex flex-col justify-center bg-white/70 p-6 backdrop-blur-2xl dark:bg-white/[0.03] sm:p-10 lg:p-12 xl:p-14">
            <LoginForm />
          </div>
        </div>
      </div>

      <p className="relative z-10 pb-6 text-center text-caption text-muted-foreground dark:text-sand-300/70">
        &copy; {new Date().getFullYear()} Lumina · Accra, Ghana
      </p>
    </main>
  );
}
