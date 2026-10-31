import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";

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
    <main className="flex min-h-[70vh] items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-1 md:p-8">
        <BrandMark className="justify-center" />
        <h1 className="mt-8 font-display text-h2 font-bold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-3 text-body-sm text-muted-foreground">{copy}</p>
        <Button asChild variant="outline" className="mt-7">
          <Link href={backHref}>
            <ArrowLeft aria-hidden="true" className="size-4" />
            {backLabel}
          </Link>
        </Button>
      </div>
    </main>
  );
}
