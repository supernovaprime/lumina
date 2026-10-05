"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    setDone(true);
    // TODO(Phase 5): replace stub with backend newsletter endpoint + toast.success.
  };

  if (done) {
    return (
      <p role="status" className="text-sm font-medium text-teal-300">
        You&apos;re subscribed — welcome aboard!
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor="newsletter-email" className="text-xs text-muted">
        Subscribe to our newsletter
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="newsletter-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "newsletter-error" : undefined}
          className="min-w-0 flex-1 rounded-full border border-border bg-transparent px-4 py-2 text-sm text-foreground placeholder:text-muted focus:border-tertiary focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Subscribe"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-fg transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <ArrowRight size={16} />
        </button>
      </div>
      {error && (
        <p id="newsletter-error" role="alert" className="mt-1.5 text-xs text-red-400">
          {error}
        </p>
      )}
    </form>
  );
}
