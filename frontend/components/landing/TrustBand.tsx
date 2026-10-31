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
    <section aria-label="What to expect from Lumina" className="bg-surface">
      <div className="mx-auto max-w-page px-4 md:px-8">
        <Stagger className="grid gap-px overflow-hidden rounded-none border-x border-border bg-border sm:grid-cols-3">
          {items.map((item) => (
            <StaggerItem key={item.title} className="bg-background">
              <div className="flex h-full items-start gap-3.5 p-5 md:p-6">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-subtle text-brand">
                  <item.icon aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <p className="text-body-sm font-semibold text-foreground">
                    {item.title}
                  </p>
                  <p className="mt-1 text-caption text-muted-foreground">
                    {item.copy}
                  </p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
