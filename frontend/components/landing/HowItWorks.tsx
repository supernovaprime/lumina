import Image from "next/image";
import {
  CalendarCheck,
  Car,
  Search,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { FadeIn } from "@/components/motion/FadeIn";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";

type Step = {
  icon: LucideIcon;
  title: string;
  copy: string;
};

const steps: Step[] = [
  {
    icon: Search,
    title: "Find your wash",
    copy: "Search your area, compare services and see starting prices before you choose a partner.",
  },
  {
    icon: CalendarCheck,
    title: "Pick a slot",
    copy: "Choose a service, date and time that fits your day. No calls, no waiting on hold.",
  },
  {
    icon: Car,
    title: "Get it clean",
    copy: "Your verified partner takes it from there while you get on with your day.",
  },
  {
    icon: Sparkles,
    title: "Leave a review",
    copy: "After the wash, share feedback so the next driver knows what to expect.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-heading"
      className="scroll-mt-24 py-section"
    >
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12 xl:px-20">
        <FadeIn>
          <div className="mb-8 flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-label font-semibold uppercase tracking-[0.1em] text-teal-600 dark:text-teal-300">
              <span
                aria-hidden="true"
                className="h-px w-5 bg-teal-600 dark:bg-teal-300"
              />
              How it works
            </p>
            <p className="font-mono text-caption text-muted-foreground dark:text-sand-300">
              Four steps
            </p>
          </div>
          <h2
            id="how-heading"
            className="text-h2 font-display font-semibold tracking-tight text-foreground text-pretty dark:text-sand-50"
          >
            Four steps from search to{" "}
            <span className="text-teal-600 dark:text-teal-300">shining.</span>
          </h2>
          <p className="mt-3 max-w-2xl text-body text-muted-foreground dark:text-sand-300">
            Lumina keeps the whole wash day in one place: discovery, prices, times and reviews. No app download required.
          </p>
        </FadeIn>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12">
          <FadeIn delay={0.1} className="order-2 lg:order-1">
            <div className="overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-r from-white/65 via-white/45 to-white/60 shadow-[0_20px_56px_-32px_rgba(0,18,25,0.4)] backdrop-blur-2xl dark:border-white/10 dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.07] dark:shadow-[0_20px_56px_-32px_rgba(0,0,0,0.8)]">
              <div className="relative aspect-[4/3]">
                <Image
                  src="/assets/hero-car.jpg"
                  alt="A clean car after a wash at a Lumina partner"
                  fill
                  sizes="(max-width: 1024px) 100vw, 46vw"
                  className="object-cover"
                />
              </div>
              <div className="p-4 text-caption text-muted-foreground dark:text-sand-300">
                A clean car, without the phone calls.
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.15} className="order-1 lg:order-2">
            <div className="overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-r from-white/65 via-white/45 to-white/60 shadow-[0_20px_56px_-32px_rgba(0,18,25,0.4)] backdrop-blur-2xl dark:border-white/10 dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.07] dark:shadow-[0_20px_56px_-32px_rgba(0,0,0,0.8)]">
              <Stagger className="grid divide-y divide-white/60 dark:divide-white/10">
                {steps.map((step, index) => (
                  <StaggerItem key={step.title}>
                    <article className="group flex h-full flex-col gap-6 px-5 py-6 sm:px-6 sm:py-8">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-mono text-caption font-medium text-muted-foreground dark:text-sand-300">
                          0{index + 1}
                        </span>
                        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/65 text-teal-600 shadow-[0_8px_24px_-16px_rgba(0,18,25,0.4)] backdrop-blur-xl transition-colors duration-300 group-hover:border-teal-600/30 group-hover:bg-white/85 dark:border-white/10 dark:bg-white/[0.06] dark:text-teal-300 dark:group-hover:border-teal-300/30 dark:group-hover:bg-white/10">
                          <step.icon aria-hidden="true" className="size-5" />
                        </span>
                      </div>

                      <div>
                        <p className="font-display text-title font-bold tracking-tight text-foreground text-pretty dark:text-sand-50">
                          {step.title}
                        </p>
                        <p className="mt-2 max-w-md text-caption text-muted-foreground dark:text-sand-300">
                          {step.copy}
                        </p>
                      </div>
                    </article>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
