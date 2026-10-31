import Image from "next/image";
import {
  CalendarCheck,
  Car,
  Search,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { SectionHeading } from "@/components/landing/SectionHeading";
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
      className="scroll-mt-24 border-b border-border bg-surface py-section"
    >
      <div className="mx-auto grid max-w-page items-center gap-12 px-4 md:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
        <FadeIn className="order-2 lg:order-1">
          <div className="overflow-hidden rounded-xl border border-border bg-surface-sunken shadow-1">
            <div className="relative aspect-[4/3]">
              <Image
                src="/assets/hero-car.jpg"
                alt="A clean car after a wash at a Lumina partner"
                fill
                sizes="(max-width: 1024px) 100vw, 46vw"
                className="object-cover"
              />
            </div>
          </div>
          <p className="mt-3 text-caption text-muted-foreground">
            A clean car, without the phone calls.
          </p>
        </FadeIn>

        <FadeIn delay={0.1} className="order-1 lg:order-2">
          <SectionHeading
            titleId="how-heading"
            eyebrow="How it works"
            title={
              <>
                Four steps from search to{" "}
                <span className="text-brand">shining.</span>
              </>
            }
            description="Lumina keeps the whole wash day in one place: discovery, prices, times and reviews. No app download required."
          />

          <Stagger className="mt-8">
            <ol>
              {steps.map((step, index) => (
                <StaggerItem key={step.title}>
                  <li className="relative flex gap-4 pb-7 last:pb-0">
                    {index < steps.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-0 left-5 top-11 w-px bg-border"
                      />
                    )}
                    <span className="relative z-10 inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-background font-mono text-caption font-medium text-brand">
                      0{index + 1}
                    </span>
                    <div className="pt-0.5">
                      <div className="flex items-center gap-2">
                        <step.icon
                          aria-hidden="true"
                          className="size-4 text-muted-foreground"
                        />
                        <h3 className="text-title font-semibold text-foreground">
                          {step.title}
                        </h3>
                      </div>
                      <p className="mt-1 max-w-md text-caption text-muted-foreground">
                        {step.copy}
                      </p>
                    </div>
                  </li>
                </StaggerItem>
              ))}
            </ol>
          </Stagger>
        </FadeIn>
      </div>
    </section>
  );
}
