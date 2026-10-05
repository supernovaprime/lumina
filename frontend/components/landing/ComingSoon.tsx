import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type ComingSoonProps = {
  title: string;
  copy: string;
  backHref?: string;
  backLabel?: string;
};

/**
 * Phase-gated placeholder: keeps every landing link resolving until the
 * real portal pages land (FRONTEND.md §10). Not a dead end — always offers a way back.
 */
export function ComingSoon({
  title,
  copy,
  backHref = "/",
  backLabel = "Back to home",
}: ComingSoonProps) {
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/logo.svg" alt="" className="mx-auto h-20 w-20" />
        <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{copy}</p>
        <Link
          href={backHref}
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-fg transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <ArrowLeft size={16} /> {backLabel}
        </Link>
      </div>
    </main>
  );
}
