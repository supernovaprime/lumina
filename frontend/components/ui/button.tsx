import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[color,background-color,border-color,transform,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-[0_16px_42px_-18px_rgba(14,180,243,0.85)] hover:-translate-y-0.5 hover:bg-primary-hover",
        gradient:
          "gradient-button rounded-[1.05rem] bg-primary text-primary-foreground shadow-[0_16px_42px_-18px_rgba(14,180,243,0.85)] hover:-translate-y-0.5",
        outline:
          "border border-sea-500/45 bg-transparent text-foreground hover:-translate-y-0.5 hover:border-sea-400 hover:bg-sea-500/10",
        gradientOutline:
          "gradient-outline rounded-[1.05rem] border border-transparent bg-transparent text-foreground hover:-translate-y-0.5 hover:border-transparent hover:bg-transparent",
        ghost: "text-muted-foreground hover:bg-surface hover:text-foreground",
      },
      size: {
        default: "h-11 px-5 text-body-sm",
        lg: "h-12 px-6 text-body",
        sm: "h-9 px-4 text-caption",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;

export function buttonClass({
  variant,
  size,
  className,
}: ButtonVariantProps & { className?: string }) {
  return cn(buttonVariants({ variant, size }), className);
}
