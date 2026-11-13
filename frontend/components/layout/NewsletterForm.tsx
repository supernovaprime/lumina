"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="mt-6 flex max-w-sm items-center gap-2.5 rounded-full border border-sea-500/20 bg-sea-500/10 px-4 py-3 text-body-sm text-foreground dark:border-sky-300/25 dark:bg-sky-300/10 dark:text-paper"
      >
        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-sea-500 text-white dark:bg-sky-300 dark:text-sea-950">
          <Check aria-hidden="true" className="size-3" strokeWidth={3} />
        </span>
        You&apos;re on the list. Watch your inbox.
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!email.trim()) return;
        setDone(true);
      }}
      className="mt-6 flex max-w-sm flex-col gap-2 sm:flex-row"
    >
      <label htmlFor="footer-email" className="sr-only">
        Email address
      </label>
      <input
        id="footer-email"
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        className="h-11 min-w-0 flex-1 rounded-full border border-border/60 bg-white/70 px-4 text-body-sm text-foreground placeholder:text-muted-foreground focus-visible:border-sea-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500/30 dark:border-white/15 dark:bg-white/[0.04] dark:text-paper dark:placeholder:text-sky-400/70 dark:focus-visible:border-sea-300/60 dark:focus-visible:ring-sea-400/40"
      />
      <button
        type="submit"
        className="group inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-sea-950 px-5 text-body-sm font-medium text-paper transition-colors hover:bg-sea-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500/40 dark:bg-white dark:text-sea-950 dark:hover:bg-paper dark:focus-visible:ring-sea-300/60"
      >
        Join the list
        <ArrowRight
          aria-hidden="true"
          className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </button>
    </form>
  );
}
