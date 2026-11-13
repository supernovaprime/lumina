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
        className="mt-6 flex max-w-sm items-center gap-2.5 rounded-full border border-sky-300/25 bg-sky-300/10 px-4 py-3 text-body-sm text-paper"
      >
        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-sky-300 text-sea-950">
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
        className="h-11 min-w-0 flex-1 rounded-full border border-white/15 bg-white/[0.04] px-4 text-body-sm text-paper placeholder:text-sky-400/70 focus-visible:border-sea-300/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-400/40"
      />
      <button
        type="submit"
        className="group inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-white px-5 text-body-sm font-medium text-sea-950 transition-colors hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-300/60"
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
