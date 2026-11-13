import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { SectionFrame, SectionHeading } from "@/components/landing/SectionFrame";
import { StepScroll } from "@/components/landing/StepScroll";
import { GlassCard } from "@/components/ui/glass-card";
import { buttonClass } from "@/components/ui/button";

export function HowItWorks() {
  return (
    <SectionFrame id="how-it-works" tone="sunken">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeading
          eyebrow="How it works"
          title={
            <>
              From pin to shine in{" "}
              <em className="font-normal italic text-sea-600 dark:text-sea-300">
                three
              </em>{" "}
              steps.
            </>
          }
          description="No phone calls, no driving around. Lumina puts every trusted wash in one place."
        />
        <Link
          href="/search"
          className={buttonClass({
            variant: "gradientOutline",
            size: "default",
            className: "group shrink-0",
          })}
        >
          Browse washes
          <ArrowRight
            aria-hidden="true"
            className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      <StepScroll />

      <GlassCard className="mt-8 flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-sky-300 opacity-60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-sky-300" />
          </span>
          <div>
            <p className="text-body-sm font-semibold text-foreground">
              24 washes open right now
            </p>
            <p className="mt-0.5 text-caption text-muted-foreground">
              Availability updates as partners confirm slots.
            </p>
          </div>
        </div>

        <Link
          href="/search"
          className={buttonClass({
            variant: "gradientOutline",
            size: "default",
            className: "group shrink-0",
          })}
        >
          Browse washes
          <ArrowRight
            aria-hidden="true"
            className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
      </GlassCard>
    </SectionFrame>
  );
}
