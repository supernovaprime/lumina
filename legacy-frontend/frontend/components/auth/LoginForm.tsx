"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Eye,
  EyeOff,
  Info,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Notice = {
  tone: "error" | "info";
  message: string;
} | null;

const fieldClassName =
  "h-12 rounded-xl border-white/70 bg-white/75 pl-11 text-foreground backdrop-blur-xl placeholder:text-muted-foreground/60 focus-visible:border-teal-600/50 focus-visible:ring-teal-600/20 dark:border-white/10 dark:bg-white/[0.06] dark:text-sand-50 dark:placeholder:text-sand-300/50 dark:focus-visible:border-gold-400/60 dark:focus-visible:ring-gold-400/20";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);
  const [invalidField, setInvalidField] = useState<
    "email" | "password" | null
  >(null);
  const [submitting, setSubmitting] = useState(false);

  const clearError = () => {
    if (notice?.tone === "error") {
      setNotice(null);
      setInvalidField(null);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    setInvalidField(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setInvalidField("email");
      setNotice({ tone: "error", message: "Enter a valid email address." });
      return;
    }

    if (password.length < 8) {
      setInvalidField("password");
      setNotice({
        tone: "error",
        message: "Password must be at least 8 characters.",
      });
      return;
    }

    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setSubmitting(false);
    setNotice({
      tone: "info",
      message:
        "Secure sign-in is almost ready. For now, explore verified washes or create an account.",
    });
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <p className="text-label font-semibold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">
        Welcome back
      </p>
      <h1 className="mt-3 font-display text-[2.1rem] font-bold leading-[1.05] tracking-tight text-foreground sm:text-[2.6rem]">
        Hello, welcome back
        <span className="text-gold-500 dark:text-gold-300">.</span>
      </h1>
      <p className="mt-3 max-w-sm text-body-sm leading-relaxed text-muted-foreground dark:text-sand-300">
        Sign in to manage bookings, save your favourite washes, and pick up
        where you left off.
      </p>

      <form onSubmit={submit} noValidate className="mt-8 space-y-5">
        <div>
          <label
            htmlFor="login-email"
            className="text-label font-medium text-foreground/80 dark:text-sand-200"
          >
            Email address
          </label>
          <div className="relative mt-1.5">
            <Mail
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground dark:text-sand-400"
            />
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                clearError();
              }}
              aria-invalid={invalidField === "email"}
              aria-describedby={notice ? "login-notice" : undefined}
              className={fieldClassName}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="text-label font-medium text-foreground/80 dark:text-sand-200"
          >
            Password
          </label>
          <div className="relative mt-1.5">
            <LockKeyhole
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground dark:text-sand-400"
            />
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                clearError();
              }}
              aria-invalid={invalidField === "password"}
              aria-describedby={notice ? "login-notice" : undefined}
              className={cn(fieldClassName, "pr-12")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/60 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40 dark:hover:bg-white/10 dark:hover:text-teal-200 dark:focus-visible:ring-gold-400/40"
            >
              {showPassword ? (
                <EyeOff aria-hidden="true" className="size-4" />
              ) : (
                <Eye aria-hidden="true" className="size-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor="login-remember"
            className="flex w-fit cursor-pointer items-center gap-2 text-caption text-muted-foreground dark:text-sand-300"
          >
            <input
              id="login-remember"
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="size-4 rounded border-border accent-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40 dark:accent-teal-400"
            />
            Remember me
          </label>
          <Link
            href="/support"
            className="rounded-sm text-caption font-medium text-teal-700 underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/50 dark:text-gold-300 dark:focus-visible:ring-gold-400/60"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={submitting}
          className="h-12 w-full rounded-xl bg-gradient-to-r from-teal-600 via-teal-700 to-teal-800 text-white shadow-[0_18px_40px_-22px_rgba(10,147,150,0.9)] transition-[background,box-shadow] hover:from-teal-700 hover:via-teal-800 hover:to-teal-900 hover:shadow-[0_20px_44px_-20px_rgba(10,147,150,0.9)] dark:from-teal-400 dark:via-teal-500 dark:to-teal-600 dark:text-navy-950 dark:shadow-[0_18px_40px_-22px_rgba(61,180,186,0.6)] dark:hover:from-teal-300 dark:hover:via-teal-400 dark:hover:to-teal-500"
        >
          {submitting ? (
            <>
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Sign in
              <ArrowRight aria-hidden="true" className="size-4" />
            </>
          )}
        </Button>

        {notice && (
          <div
            id="login-notice"
            role={notice.tone === "error" ? "alert" : "status"}
            className={cn(
              "flex items-start gap-2 rounded-xl border p-3 text-caption",
              notice.tone === "error"
                ? "border-destructive/25 bg-destructive/5 text-destructive"
                : "border-teal-600/20 bg-teal-500/10 text-teal-800 dark:border-teal-300/20 dark:bg-teal-300/10 dark:text-teal-200",
            )}
          >
            {notice.tone === "error" ? (
              <AlertCircle
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0"
              />
            ) : (
              <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            )}
            <span>{notice.message}</span>
          </div>
        )}
      </form>

      <div className="mt-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-border/70 dark:bg-white/10" />
        <span className="text-label font-medium uppercase tracking-[0.12em] text-muted-foreground dark:text-sand-400">
          or
        </span>
        <span className="h-px flex-1 bg-border/70 dark:bg-white/10" />
      </div>

      <div className="mt-4 space-y-2 text-center text-caption text-muted-foreground dark:text-sand-300">
        <p>
          New to Lumina?{" "}
          <Link
            href="/register"
            className="font-semibold text-teal-700 underline-offset-4 hover:underline dark:text-gold-300"
          >
            Create an account
          </Link>
        </p>
        <p>
          Just browsing?{" "}
          <Link
            href="/search"
            className="inline-flex items-center gap-1 font-medium text-teal-700 underline-offset-4 hover:underline dark:text-gold-300"
          >
            Explore washes
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </Link>
        </p>
      </div>

      <div className="mt-6 flex items-center justify-center gap-1.5 text-label text-muted-foreground dark:text-sand-400">
        <ShieldCheck
          aria-hidden="true"
          className="size-3.5 text-teal-600 dark:text-teal-300"
        />
        Secure sign-in · We never share your details
      </div>

      <p className="mt-3 text-center text-label leading-relaxed text-muted-foreground/80 dark:text-sand-400/80">
        By continuing you agree to our{" "}
        <Link
          href="/legal#terms"
          className="underline underline-offset-2 transition-colors hover:text-teal-700 dark:hover:text-gold-300"
        >
          Terms
        </Link>{" "}
        and{" "}
        <Link
          href="/legal#privacy"
          className="underline underline-offset-2 transition-colors hover:text-teal-700 dark:hover:text-gold-300"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
