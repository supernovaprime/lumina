import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-xs border px-2.5 py-1 text-label font-semibold uppercase tracking-[0.08em]",
  {
    variants: {
      variant: {
        default:
          "border-border bg-surface-sunken text-muted-foreground",
        brand:
          "border-lagoon-200 bg-brand-subtle text-brand-subtle-foreground dark:border-lagoon-800",
        action:
          "border-marigold-500/30 bg-marigold-100 text-marigold-900 dark:border-marigold-700 dark:bg-marigold-950 dark:text-marigold-200",
        success:
          "border-green-200 bg-success-subtle text-success-subtle-foreground dark:border-green-800",
        warning:
          "border-marigold-300 bg-warning-subtle text-warning-subtle-foreground dark:border-marigold-800",
        destructive:
          "border-red-200 bg-destructive-subtle text-destructive-subtle-foreground dark:border-red-800",
        outline:
          "border-border-strong bg-transparent text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
