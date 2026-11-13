import { BadgeCheck, ReceiptText, Star, type LucideIcon } from "lucide-react";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";

type TrustItem = {
  icon: LucideIcon;
  title: string;
  copy: string;
};

const items: TrustItem[] = [
  {
    icon: BadgeCheck,
    title: "Verified partners",
    copy: "We check the businesses before they appear on Lumina.",
  },
  {
    icon: ReceiptText,
    title: "Prices before you book",
    copy: "See the service and the price up front, with no surprises.",
  },
  {
    icon: Star,
    title: "Reviews you can trace",
    copy: "Feedback comes from customers after a completed wash.",
  },
];

export function TrustBand() {
  return (
    <section aria-label="What to expect from Lumina" className="relative">
      <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10 xl:px-20">
        <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/55 shadow-[0_20px_56px_-32px_rgba(0,18,25,0.4)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_20px_56px_-32px_rgba(0,0,0,0.8)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-transparent px-5 py-4 md:px-6">
            <p className="flex items-center gap-2 text-label font-semibold uppercase tracking-[0.1em] text-teal-600 dark:text-teal-300">
              <span
                aria-hidden="true"
                className="h-px w-5 bg-teal-600 dark:bg-teal-300"
              />
              The Lumina standard
            </p>
            <p className="font-mono text-caption text-muted-foreground dark:text-sand-300">
              Before you book
            </p>
          </div>

          <Stagger className="grid divide-y divide-transparent sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {items.map((item, index) => (
              <StaggerItem key={item.title}>
                <article className="group flex h-full flex-col gap-6 px-5 py-6 sm:px-6 sm:py-8">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-mono text-caption font-medium text-muted-foreground dark:text-sand-300">
                      0{index + 1}
                    </span>
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/65 text-teal-600 shadow-[0_8px_24px_-16px_rgba(0,18,25,0.4)] backdrop-blur-xl transition-colors duration-300 group-hover:border-teal-600/30 group-hover:bg-white/85 dark:border-white/10 dark:bg-white/[0.06] dark:text-teal-300 dark:group-hover:border-teal-300/30 dark:group-hover:bg-white/10">
                      <item.icon aria-hidden="true" className="size-5" />
                    </span>
                  </div>

                  <div>
                    <p className="font-display text-title font-bold tracking-tight text-foreground text-pretty dark:text-sand-50">
                      {item.title}
                    </p>
                    <p className="mt-2 max-w-xs text-caption text-muted-foreground dark:text-sand-300">
                      {item.copy}
                    </p>
                  </div>
                </article>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  );
}
