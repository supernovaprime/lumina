import {
  ArrowRight,
  CalendarCheck,
  Car,
  Search,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";

type Step = { icon: LucideIcon; title: string; copy: string };

const steps: Step[] = [
  {
    icon: Search,
    title: "Find a Car Wash",
    copy: "Search for nearby car washes or browse our list of trusted partners.",
  },
  {
    icon: CalendarCheck,
    title: "Book a Service",
    copy: "Choose your service, preferred date and time.",
  },
  {
    icon: Car,
    title: "Get Your Car Washed",
    copy: "Relax while our professionals take care of your vehicle.",
  },
  {
    icon: Sparkles,
    title: "Enjoy the Results",
    copy: "Drive away clean, fresh and confident.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-heading"
      className="relative"
    >
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 md:px-8 md:py-24 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <Reveal>
          <h2
            id="how-heading"
            className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl"
          >
            How It Works
          </h2>
          <p className="mt-2 text-sm text-muted md:text-base">
            Get your car washed in just a few simple steps.
          </p>
          <ol className="mt-10 flex flex-col gap-8 md:flex-row md:gap-4 lg:flex-col lg:gap-8">
            {steps.map((step, i) => (
              <li key={step.title} className="flex flex-1 items-start gap-4">
                <span className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-gold-600/70 text-gold-600 dark:border-gold-500/70 dark:text-gold-400">
                  <step.icon size={21} />
                  <span
                    aria-hidden="true"
                    className="absolute -right-1.5 -top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gold-500 font-mono text-xs font-bold text-navy-950"
                  >
                    {i + 1}
                  </span>
                </span>
                <span className="pt-1">
                  <h3 className="font-display text-base font-bold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {step.copy}
                  </p>
                </span>
                {i < steps.length - 1 && (
                  <ArrowRight
                    aria-hidden="true"
                    className="ml-auto hidden shrink-0 rotate-90 self-center text-gold-500/70 md:block lg:rotate-0"
                    size={20}
                  />
                )}
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal
          delayMs={120}
          className="relative min-h-[280px] overflow-hidden rounded-2xl bg-background shadow-sm lg:min-h-[420px]"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_1px_1px,var(--color-border)_1px,transparent_0)] [background-size:22px_22px]"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/logo.svg"
            alt=""
            loading="lazy"
            className="absolute left-1/2 top-1/2 w-2/3 max-w-xs -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_50px_rgba(238,155,0,0.35)]"
          />
          <p
            aria-hidden="true"
            className="absolute bottom-6 right-6 -rotate-3 text-right font-display text-xl font-semibold italic text-gold-700 drop-shadow-sm dark:text-gold-300 md:text-2xl"
          >
            It&apos;s More Than
            <span className="block underline decoration-gold-500 decoration-2 underline-offset-4">
              Just a Wash
            </span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
