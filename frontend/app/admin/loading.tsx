import { Loader2 } from "lucide-react";

import { glassCardClass } from "@/components/ui/glass-card";

export default function AdminLoading() {
  return (
    <div
      className={glassCardClass(
        "flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8"
      )}
    >
      <Loader2
        aria-hidden="true"
        className="size-5 animate-spin text-sea-600 dark:text-sea-300"
      />
      <p className="font-mono text-label uppercase tracking-[0.18em] text-muted-foreground dark:text-sky-400/70">
        Loading console
      </p>
    </div>
  );
}
