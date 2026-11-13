import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  tagline?: boolean;
  tone?: "default" | "light";
};

export function BrandMark({
  className,
  tagline = true,
  tone = "default",
}: BrandMarkProps) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Image
        src="/assets/logo-mark.png"
        alt=""
        width={80}
        height={80}
        sizes="40px"
        className="size-10 shrink-0 rounded-md object-cover"
      />
      <span className="leading-none">
        <span
          className={cn(
            "block font-display text-xl font-bold tracking-tight",
            tone === "light" ? "text-white" : "text-foreground",
          )}
        >
          Lumi<span className={tone === "light" ? "text-lagoon-300" : "text-brand"}>na</span>
        </span>
        {tagline && (
          <span
            className={cn(
              "mt-1 block text-label font-medium",
              tone === "light" ? "text-sand-300" : "text-muted-foreground",
            )}
          >
            Cleaner cars. Brighter days.
          </span>
        )}
      </span>
    </span>
  );
}
