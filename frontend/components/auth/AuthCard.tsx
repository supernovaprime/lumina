"use client";

import {
  useState,
  type FormEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { AuthArtSlideshow } from "@/components/auth/AuthArtSlideshow";
import { buttonClass } from "@/components/ui/button";
import { ApiError, login, registerCustomer, type UserRole } from "@/lib/api";
import { markAdminWelcome, saveSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "signup";

const tabs: { id: AuthMode; label: string }[] = [
  { id: "login", label: "Log in" },
  { id: "signup", label: "Sign up" },
];

const roleLabels: Record<UserRole, string> = {
  CUSTOMER: "a customer",
  BUSINESS: "a business",
  ADMIN: "an admin",
};

export function AuthCard() {
  const [mode, setMode] = useState<AuthMode>("login");
  const reduceMotion = useReducedMotion();

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    nextMode: AuthMode
  ) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

    event.preventDefault();
    setMode(nextMode);
    window.requestAnimationFrame(() => {
      document.getElementById(`auth-tab-${nextMode}`)?.focus();
    });
  };

  return (
    <div className="relative w-full max-w-5xl">
      <div className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-surface/75 p-1.5 shadow-[0_36px_100px_-50px_rgba(4,28,40,0.6)] backdrop-blur-2xl dark:border-white/10 dark:bg-sea-950/70 dark:shadow-[0_40px_110px_-45px_rgba(0,0,0,0.9)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/20"
        />
        <div className="relative grid overflow-hidden rounded-[1.62rem] border border-border/50 bg-surface-raised/70 lg:grid-cols-[1.02fr_1fr] dark:border-white/10 dark:bg-sea-950/80">
          <AuthArtSlideshow />

          <div className="border-t border-border/50 px-6 py-8 sm:px-9 sm:py-10 lg:border-l lg:border-t-0 lg:px-11 lg:py-12 dark:border-white/10">
            <div
              role="tablist"
              aria-label="Account access"
              className="grid grid-cols-2 gap-1 rounded-2xl border border-border/60 bg-muted/45 p-1 dark:border-white/10 dark:bg-white/[0.04]"
            >
              {tabs.map((tab) => {
                const active = mode === tab.id;
                const nextMode = tab.id === "login" ? "signup" : "login";

                return (
                  <button
                    key={tab.id}
                    id={`auth-tab-${tab.id}`}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-controls={`auth-panel-${tab.id}`}
                    tabIndex={active ? 0 : -1}
                    onClick={() => setMode(tab.id)}
                    onKeyDown={(event) => handleTabKeyDown(event, nextMode)}
                    className={cn(
                      "relative flex h-11 items-center justify-center rounded-[0.9rem] px-4 text-body-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised dark:focus-visible:ring-sea-300/60 dark:focus-visible:ring-offset-sea-950",
                      active
                        ? "text-foreground dark:text-paper"
                        : "text-muted-foreground hover:text-foreground dark:text-sky-300/70 dark:hover:text-paper"
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId={reduceMotion ? undefined : "auth-tab-pill"}
                        transition={
                          reduceMotion
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 380, damping: 32 }
                        }
                        className="absolute inset-0 rounded-[0.9rem] bg-surface-raised shadow-[0_10px_30px_-18px_rgba(4,28,40,0.45)] dark:bg-white/[0.08] dark:shadow-[0_10px_30px_-18px_rgba(0,0,0,0.8)]"
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-8">
              <p className="font-mono text-label font-medium uppercase tracking-[0.16em] text-sea-700 dark:text-sea-300">
                {mode === "login" ? "Welcome back" : "Join Lumina"}
              </p>
              <h2 className="mt-2 text-balance bg-gradient-to-r from-sea-800 via-sea-600 to-sea-400 bg-clip-text font-display text-h2 font-semibold text-transparent dark:from-sea-300 dark:via-sky-200 dark:to-white">
                {mode === "login"
                  ? "Log in to your account."
                  : "Create your account."}
              </h2>
              <p className="mt-3 max-w-md text-pretty text-body-sm text-muted-foreground dark:text-sky-300/75">
                {mode === "login"
                  ? "Pick up your bookings, saved cars, and favourite washes right where you left off."
                  : "Set up your Lumina account in a minute and book trusted washes around Accra."}
              </p>
            </div>

            <div
              role="tabpanel"
              id="auth-panel-login"
              aria-labelledby="auth-tab-login"
              hidden={mode !== "login"}
              className="mt-7 focus-visible:outline-none"
            >
              <LoginForm onSwitch={() => setMode("signup")} />
            </div>

            <div
              role="tabpanel"
              id="auth-panel-signup"
              aria-labelledby="auth-tab-signup"
              hidden={mode !== "signup"}
              className="mt-7 focus-visible:outline-none"
            >
              <SignUpForm onSwitch={() => setMode("login")} />
            </div>

            <div className="mt-8 flex items-start gap-2 border-t border-border/50 pt-5 text-label text-muted-foreground dark:border-white/10 dark:text-sky-400/70">
              <ShieldCheck
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-sea-600 dark:text-sky-300"
              />
              <p>
                Your details stay private. Lumina never sells your data or shares
                it without permission.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitting) return;

    const form = event.currentTarget;
    const data = new FormData(form);

    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const remember = data.get("remember") === "on";

    if (!email || !password) {
      toast.error("Sign in failed", {
        description: "Enter your email address and password.",
      });
      return;
    }

    setSubmitting(true);

    try {
      const result = await login({ email, password });

      saveSession(
        {
          accessToken: result.accessToken,
          user: result.user,
          customer: result.customer,
          business: result.business,
        },
        remember
      );

      toast.success("Signed in successfully!", {
        description: `Welcome back. You're signed in as ${roleLabels[result.user.role] ?? "a Lumina user"}.`,
      });

      if (result.user.role === "ADMIN") {
        markAdminWelcome();
      }

      form.reset();
      router.push(result.user.role === "ADMIN" ? "/admin" : "/");
      router.refresh();
    } catch (error) {
      const description =
        error instanceof ApiError
          ? error.message
          : "Something went wrong while signing you in. Please try again.";

      toast.error("Sign in failed", { description });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AuthInput
        id="login-email"
        name="email"
        type="email"
        label="Email address"
        icon={Mail}
        autoComplete="email"
        placeholder="you@example.com"
        required
      />

      <PasswordField
        id="login-password"
        name="password"
        label="Password"
        autoComplete="current-password"
        placeholder="Enter your password"
        required
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-caption text-muted-foreground dark:text-sky-300/75">
          <input
            type="checkbox"
            name="remember"
            className="size-4 rounded border-border bg-surface-raised accent-sea-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised dark:border-white/20 dark:bg-white/10 dark:focus-visible:ring-sea-300/60 dark:focus-visible:ring-offset-sea-950"
          />
          Remember me
        </label>
        <button
          type="button"
          onClick={() =>
            toast.info("Password reset is coming soon", {
              description:
                "We'll connect password reset to your email in the next step.",
            })
          }
          className="text-caption font-medium text-sea-700 underline-offset-4 transition-colors hover:text-sea-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500/60 dark:text-sea-300 dark:hover:text-paper dark:focus-visible:ring-sea-300/60"
        >
          Forgot password?
        </button>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className={buttonClass({
          variant: "gradient",
          size: "lg",
          className: "group mt-1 w-full",
        })}
      >
        {submitting ? (
          <>
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            Signing in…
          </>
        ) : (
          <>
            Log in
            <ArrowRight
              aria-hidden="true"
              className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </>
        )}
      </button>

      <p className="pt-1 text-center text-caption text-muted-foreground dark:text-sky-300/70">
        New to Lumina?{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="font-semibold text-sea-700 underline-offset-4 transition-colors hover:text-sea-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500/60 dark:text-sea-300 dark:hover:text-paper dark:focus-visible:ring-sea-300/60"
        >
          Create an account
        </button>
      </p>
    </form>
  );
}

function SignUpForm({ onSwitch }: { onSwitch: () => void }) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitting) return;

    const form = event.currentTarget;
    const data = new FormData(form);

    const fullName = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");

    if (fullName.length < 2) {
      toast.error("Account creation failed", {
        description: "Please enter your full name.",
      });
      return;
    }

    if (password.length < 8) {
      toast.error("Account creation failed", {
        description: "Your password must be at least 8 characters long.",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Account creation failed", {
        description: "The two passwords don't match. Please try again.",
      });
      return;
    }

    const [firstName, ...rest] = fullName.split(/\s+/);
    const lastName = rest.join(" ");

    setSubmitting(true);

    try {
      const result = await registerCustomer({
        email,
        password,
        firstName,
        lastName,
        phone: phone || undefined,
      });

      toast.success("Account created successfully!", {
        description: `Welcome to Lumina, ${firstName}. We've sent a verification email to ${result.email}.`,
      });

      form.reset();
    } catch (error) {
      const description =
        error instanceof ApiError
          ? error.message
          : "Something went wrong while creating your account. Please try again.";

      toast.error("Account creation failed", { description });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AuthInput
        id="signup-name"
        name="name"
        type="text"
        label="Full name"
        icon={UserRound}
        autoComplete="name"
        placeholder="Ama Mensah"
        required
      />

      <AuthInput
        id="signup-email"
        name="email"
        type="email"
        label="Email address"
        icon={Mail}
        autoComplete="email"
        placeholder="you@example.com"
        required
      />

      <AuthInput
        id="signup-phone"
        name="phone"
        type="tel"
        label="Phone number (optional)"
        icon={Phone}
        autoComplete="tel"
        placeholder="+233 20 000 0000"
      />

      <PasswordField
        id="signup-password"
        name="password"
        label="Password"
        autoComplete="new-password"
        placeholder="Create a password"
        hint="Use at least 8 characters, including a number."
        minLength={8}
        required
      />

      <PasswordField
        id="signup-confirm-password"
        name="confirmPassword"
        label="Confirm password"
        autoComplete="new-password"
        placeholder="Repeat your password"
        minLength={8}
        required
      />

      <label className="flex items-start gap-2.5 text-caption text-muted-foreground dark:text-sky-300/75">
        <input
          type="checkbox"
          name="updates"
          className="mt-0.5 size-4 shrink-0 rounded border-border bg-surface-raised accent-sea-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised dark:border-white/20 dark:bg-white/10 dark:focus-visible:ring-sea-300/60 dark:focus-visible:ring-offset-sea-950"
        />
        <span>
          Send me occasional offers and wash tips. You can unsubscribe any time.
        </span>
      </label>

      <button
        type="submit"
        disabled={submitting}
        className={buttonClass({
          variant: "gradientOutline",
          size: "lg",
          className: "group mt-1 w-full",
        })}
      >
        {submitting ? (
          <>
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            Creating account…
          </>
        ) : (
          <>
            Create account
            <ArrowRight
              aria-hidden="true"
              className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </>
        )}
      </button>

      <p className="pt-1 text-center text-caption text-muted-foreground dark:text-sky-300/70">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="font-semibold text-sea-700 underline-offset-4 transition-colors hover:text-sea-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500/60 dark:text-sea-300 dark:hover:text-paper dark:focus-visible:ring-sea-300/60"
        >
          Log in
        </button>
      </p>
    </form>
  );
}

function AuthInput({
  label,
  icon: Icon,
  hint,
  trailing,
  className,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon: LucideIcon;
  hint?: string;
  trailing?: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-caption font-medium text-foreground dark:text-paper"
      >
        {label}
      </label>
      <div className="relative">
        <Icon
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground dark:text-sky-400/70"
        />
        <input
          id={id}
          className={cn(
            "h-12 w-full rounded-2xl border border-border/70 bg-surface-raised/70 pl-11 pr-4 text-body-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] outline-none transition placeholder:text-muted-foreground/65 focus:border-sea-500/60 focus:ring-4 focus:ring-sea-500/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-paper dark:placeholder:text-sky-400/50 dark:focus:border-sea-300/60 dark:focus:ring-sea-300/10",
            trailing ? "pr-12" : "pr-4",
            className
          )}
          {...props}
        />
        {trailing && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {trailing}
          </div>
        )}
      </div>
      {hint && (
        <p className="mt-1.5 text-label text-muted-foreground dark:text-sky-400/70">
          {hint}
        </p>
      )}
    </div>
  );
}

function PasswordField({
  id,
  name,
  label,
  autoComplete,
  placeholder,
  hint,
  minLength,
  required,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  placeholder: string;
  hint?: string;
  minLength?: number;
  required?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <AuthInput
      id={id}
      name={name}
      type={visible ? "text" : "password"}
      label={label}
      icon={LockKeyhole}
      autoComplete={autoComplete}
      placeholder={placeholder}
      hint={hint}
      minLength={minLength}
      required={required}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500/60 dark:text-sky-400/70 dark:hover:bg-white/10 dark:hover:text-paper dark:focus-visible:ring-sea-300/60"
        >
          {visible ? (
            <EyeOff aria-hidden="true" className="size-4" />
          ) : (
            <Eye aria-hidden="true" className="size-4" />
          )}
        </button>
      }
    />
  );
}
