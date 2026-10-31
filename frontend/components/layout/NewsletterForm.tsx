"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  };

  if (done) {
    return (
      <p
        role="status"
        className="flex items-start gap-2 text-caption font-medium text-success"
      >
        <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        Thanks. Newsletter delivery is not connected yet.
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <label
        htmlFor="newsletter-email"
        className="text-caption text-muted-foreground"
      >
        Product updates and wash tips, occasionally.
      </label>
      <div className="mt-2.5 flex gap-2">
        <Input
          id="newsletter-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "newsletter-error" : undefined}
        />
        <Button
          type="submit"
          size="icon"
          className="size-12 shrink-0"
          aria-label="Subscribe"
        >
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
      {error && (
        <p
          id="newsletter-error"
          role="alert"
          className="mt-1.5 text-caption text-destructive"
        >
          {error}
        </p>
      )}
    </form>
  );
}
