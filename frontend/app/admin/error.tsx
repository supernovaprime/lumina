"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import { buttonClass } from "@/components/ui/button";
import { glassCardClass } from "@/components/ui/glass-card";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className={glassCardClass(
        "flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center"
      )}
    >
      <span className="grid size-12 place-items-center rounded-2xl border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:border-amber-300/25 dark:text-amber-300">
        <AlertTriangle aria-hidden="true" className="size-5" />
      </span>
      <div>
        <h1 className="font-display text-h3 font-semibold text-foreground">
          Something went wrong in the console
        </h1>
        <p className="mt-2 max-w-md text-body-sm text-muted-foreground dark:text-sky-300/70">
          {error.message ||
            "An unexpected error interrupted this view. Try again, or return to the dashboard."}
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className={buttonClass({ variant: "gradient", size: "default" })}
      >
        <RefreshCw aria-hidden="true" className="size-4" />
        Try again
      </button>
    </div>
  );
}
