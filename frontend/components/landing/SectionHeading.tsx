import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  align?: "left" | "center";
  tone?: "default" | "light";
  className?: string;
  titleId?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  tone = "default",
  className,
  titleId,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      <p
        className={cn(
          "flex items-center gap-2 text-label font-semibold uppercase tracking-[0.1em]",
          align === "center" && "justify-center",
          tone === "light" ? "text-marigold-300" : "text-brand",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "h-px w-5",
            tone === "light" ? "bg-marigold-300" : "bg-brand",
          )}
        />
        {eyebrow}
      </p>
      <h2
        id={titleId}
        className={cn(
          "mt-3 font-display text-h1 font-bold tracking-[-0.02em] text-balance",
          tone === "light" ? "text-white" : "text-foreground",
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "mt-4 text-body",
            tone === "light" ? "text-sand-300" : "text-muted-foreground",
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
