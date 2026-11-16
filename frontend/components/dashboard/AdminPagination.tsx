"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

const countFormatter = new Intl.NumberFormat("en-US");

export function AdminPagination({
  page,
  totalPages,
  total,
  pageSize,
  loading = false,
  itemLabel = "records",
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  loading?: boolean;
  itemLabel?: string;
  onPageChange: (page: number) => void;
}) {
  const pageItems = useMemo<Array<number | "gap-left" | "gap-right">>(() => {
    if (totalPages <= 1) return [];
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const items: Array<number | "gap-left" | "gap-right"> = [1];
    if (page > 4) items.push("gap-left");

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let value = start; value <= end; value += 1) {
      items.push(value);
    }

    if (page < totalPages - 3) items.push("gap-right");
    items.push(totalPages);
    return items;
  }, [page, totalPages]);

  if (totalPages <= 1) return null;

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-2 border-t border-border/55 px-4 py-3 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="text-caption text-muted-foreground dark:text-sky-300/70">
        Showing {countFormatter.format(start)}–{countFormatter.format(end)} of{" "}
        {countFormatter.format(total)} {itemLabel}
        <span className="mx-1.5" aria-hidden="true">
          ·
        </span>
        Page {page} of {totalPages}
      </p>

      <nav aria-label={`Pagination for ${itemLabel}`}>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1 || loading}
            aria-label="Previous page"
            className="inline-flex h-8 items-center gap-1 rounded-full border border-border/60 bg-surface-raised/45 px-2.5 text-caption font-medium text-muted-foreground transition-colors hover:border-sea-500/30 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.03] dark:text-sky-300/70 dark:hover:border-sea-300/25 dark:hover:text-paper"
          >
            <ChevronLeft aria-hidden="true" className="size-3.5" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          {pageItems.map((item) =>
            typeof item === "number" ? (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                aria-current={item === page ? "page" : undefined}
                aria-label={`Page ${item}`}
                disabled={loading}
                className={cn(
                  "grid size-8 place-items-center rounded-full border text-caption font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                  item === page
                    ? "border-sea-500/40 bg-sea-500/15 text-sea-800 dark:border-sea-300/30 dark:bg-sea-400/15 dark:text-sea-100"
                    : "border-border/60 bg-surface-raised/45 text-muted-foreground hover:border-sea-500/30 hover:text-foreground dark:border-white/10 dark:bg-white/[0.03] dark:text-sky-300/70 dark:hover:border-sea-300/25 dark:hover:text-paper"
                )}
              >
                {item}
              </button>
            ) : (
              <span
                key={item}
                aria-hidden="true"
                className="grid size-6 place-items-center text-caption text-muted-foreground dark:text-sky-400/55"
              >
                …
              </span>
            )
          )}

          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages || loading}
            aria-label="Next page"
            className="inline-flex h-8 items-center gap-1 rounded-full border border-border/60 bg-surface-raised/45 px-2.5 text-caption font-medium text-muted-foreground transition-colors hover:border-sea-500/30 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.03] dark:text-sky-300/70 dark:hover:border-sea-300/25 dark:hover:text-paper"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      </nav>
    </div>
  );
}
