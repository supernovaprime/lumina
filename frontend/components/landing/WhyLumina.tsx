import {
  BellRing,
  Check,
  LockKeyhole,
  ShieldCheck,
  Star,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { SectionHeading } from "@/components/landing/SectionHeading";
import { FadeIn } from "@/components/motion/FadeIn";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { Card } from "@/components/ui/card";

const checks = [
  "Business identity and contact details checked",
  "Services and starting prices published up front",
  "Reviews only from customers with a completed wash",
];

type Reason = {
  icon: LucideIcon;
  title: string;
  copy: string;
};

const reasons: Reason[] = [
  {
    icon: Wallet,
    title: "Prices up front",
    copy: "See the service price before checkout, so there is no guesswork at the counter.",
  },
  {
    icon: LockKeyhole,
    title: "Secure checkout",
    copy: "Pay the way that suits you. Sensitive payment details are handled by the payment provider.",
  },
  {
    icon: Star,
    title: "Reviews with receipts",
    copy: "Only customers who completed a booking can leave a review, so feedback reflects a real wash.",
  },
  {
    icon: BellRing,
    title: "Reminders that help",
    copy: "Get a nudge before your slot, so a busy day does not cost you your booking.",
  },
];

export function WhyLumina() {
  return (
    <section
      id="why-lumina"
      aria-labelledby="why-heading"
      className="relative isolate scroll-mt-24 overflow-hidden border-b border-transparent py-section"
    >
      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12 xl:px-20">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-16">
          <FadeIn>
            <SectionHeading
              titleId="why-heading"
              eyebrow="Why Lumina"
              title={
                <>
                  Less guesswork.{" "}
                  <span className="text-gold-300">More confidence.</span>
                </>
              }
              description="A marketplace should make the choice easier, not just longer. Lumina is built around the details that matter before you hand over your keys."
            />

            <div className="mt-8 overflow-hidden rounded-2xl border border-white/60 bg-white/55 shadow-[0_20px_56px_-32px_rgba(0,18,25,0.4)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_20px_56px_-32px_rgba(0,0,0,0.8)] p-5 md:p-6">
              <div className="flex items-start gap-3">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-subtle text-brand">
                  <ShieldCheck aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <p className="text-body-sm font-semibold text-foreground">
                    What we check before a partner goes live
                  </p>
                  <p className="mt-1 text-caption text-muted-foreground">
                    Verification is about the business, not a paid badge.
                  </p>
                </div>
              </div>

              <ul className="mt-5 space-y-3 border-t border-transparent pt-5">
                {checks.map((check) => (
                  <li
                    key={check}
                    className="flex items-start gap-2.5 text-caption text-foreground"
                  >
                    <span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-brand">
                      <Check aria-hidden="true" className="size-3" strokeWidth={3} />
                    </span>
                    {check}
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>

          <Stagger className="grid gap-4 sm:grid-cols-2">
            {reasons.map((reason, index) => (
              <StaggerItem key={reason.title}>
                <div className={`group h-full overflow-hidden rounded-2xl border border-white/60 bg-white/55 shadow-[0_20px_56px_-32px_rgba(0,18,25,0.4)] backdrop-blur-2xl transition-[background-color,border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-teal-600/30 hover:bg-white/75 hover:shadow-[0_24px_64px_-34px_rgba(0,18,25,0.5)] motion-reduce:transform-none dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_20px_56px_-32px_rgba(0,0,0,0.8)] dark:hover:border-teal-300/30 dark:hover:bg-white/[0.08] dark:hover:shadow-[0_24px_64px_-34px_rgba(0,0,0,0.9)] p-5 md:p-6 ${index === 0 ? 'sm:col-span-2' : ''}`}>
                  <span className="inline-flex size-10 items-center justify-center rounded-md bg-surface-sunken text-brand transition-transform duration-300 group-hover:animate-wobble">
                    <reason.icon aria-hidden="true" className="size-5" />
                  </span>
                  <h3 className="mt-5 font-display text-title font-bold tracking-tight text-foreground transition-colors duration-300 group-hover:text-teal-600 dark:group-hover:text-teal-300">
                    {reason.title}
                  </h3>
                  <p className="mt-1.5 text-caption text-muted-foreground">
                    {reason.copy}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  );
}
