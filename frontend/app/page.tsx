import { Clock, MapPin } from "lucide-react";

import { Hero } from "@/components/landing/Hero";
import { SiteHeader } from "@/components/landing/SiteHeader";

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-background p-2 sm:p-3 lg:p-4">
      <div className="stage-surface relative mx-auto flex min-h-[calc(100dvh-1rem)] max-w-[var(--container-page)] flex-col overflow-hidden rounded-[2rem] sm:min-h-[calc(100dvh-1.5rem)] sm:rounded-[2.5rem] lg:min-h-[calc(100dvh-2rem)]">
        <SiteHeader />
        <Hero />

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-border/60 px-5 py-4 text-label uppercase tracking-[0.16em] text-muted-foreground sm:px-8 lg:px-12">
          <span className="flex items-center gap-2">
            <MapPin aria-hidden="true" className="size-3.5 text-orchid-500 dark:text-orchid-300" />
            Accra · East Legon
          </span>
          <span className="hidden text-muted-foreground/80 sm:inline">
            Exterior · Interior · Wax · Detailing
          </span>
          <span className="flex items-center gap-2">
            <Clock aria-hidden="true" className="size-3.5 text-orchid-500 dark:text-orchid-300" />
            Open daily · 7am – 8pm
          </span>
        </div>
      </div>
    </main>
  );
}
