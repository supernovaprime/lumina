import Image from "next/image";
import { Quote } from "lucide-react";
import { SectionHeading } from "@/components/landing/SectionHeading";
import { FadeIn } from "@/components/motion/FadeIn";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { Card } from "@/components/ui/card";
import { testimonials } from "@/lib/data/testimonials";

export function Testimonials() {
  return (
    <section
      id="testimonials"
      aria-labelledby="testimonials-heading"
      className="relative isolate scroll-mt-24 overflow-hidden border-b border-transparent py-section"
    >
      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12 xl:px-20">
        <FadeIn>
          <SectionHeading
            titleId="testimonials-heading"
            eyebrow="Customer stories"
            title={
              <>
                The best review is a{" "}
                <span className="text-gold-300">cleaner car.</span>
              </>
            }
            description="What early customers noticed after booking a wash through Lumina."
          />
        </FadeIn>

        <Stagger className="mt-10 grid gap-4 md:grid-cols-3">
          {testimonials.map((item) => (
            <StaggerItem key={item.name} className="h-full">
              <div className="group h-full overflow-hidden rounded-2xl border border-white/60 bg-white/55 shadow-[0_20px_56px_-32px_rgba(0,18,25,0.4)] backdrop-blur-2xl transition-[background-color,border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-teal-600/30 hover:bg-white/75 hover:shadow-[0_24px_64px_-34px_rgba(0,18,25,0.5)] motion-reduce:transform-none dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_20px_56px_-32px_rgba(0,0,0,0.8)] dark:hover:border-teal-300/30 dark:hover:bg-white/[0.08] dark:hover:shadow-[0_24px_64px_-34px_rgba(0,0,0,0.9)] p-5 md:p-6">
                <Quote
                  aria-hidden="true"
                  className="size-7 text-marigold-500 transition-transform duration-300 group-hover:animate-wobble"
                  fill="currentColor"
                  strokeWidth={0}
                />
                <blockquote className="mt-4 flex-1 text-body text-foreground">
                  &ldquo;{item.quote}&rdquo;
                </blockquote>

                <div className="mt-6 flex items-center gap-3 border-t border-transparent pt-5">
                  <span className="relative size-11 shrink-0 overflow-hidden rounded-full bg-surface-sunken">
                    <Image
                      src={item.avatar}
                      alt={item.name}
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="text-body-sm font-semibold text-foreground transition-colors duration-300 group-hover:text-teal-600 dark:group-hover:text-teal-300">
                      {item.name}
                    </p>
                    <p className="text-caption text-muted-foreground">
                      {item.role}
                    </p>
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        <p className="mt-4 text-caption text-muted-foreground">
          Sample customer feedback shown for this preview.
        </p>
      </div>
    </section>
  );
}
