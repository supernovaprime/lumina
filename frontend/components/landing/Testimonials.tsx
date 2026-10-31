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
      className="scroll-mt-24 border-b border-border bg-surface py-section"
    >
      <div className="mx-auto max-w-page px-4 md:px-8">
        <FadeIn>
          <SectionHeading
            titleId="testimonials-heading"
            eyebrow="Customer stories"
            title={
              <>
                The best review is a{" "}
                <span className="text-brand">cleaner car.</span>
              </>
            }
            description="What early customers noticed after booking a wash through Lumina."
          />
        </FadeIn>

        <Stagger className="mt-10 grid gap-4 md:grid-cols-3">
          {testimonials.map((item) => (
            <StaggerItem key={item.name} className="h-full">
              <Card className="flex h-full flex-col p-5 md:p-6">
                <Quote
                  aria-hidden="true"
                  className="size-7 text-marigold-500"
                  fill="currentColor"
                  strokeWidth={0}
                />
                <blockquote className="mt-4 flex-1 text-body text-foreground">
                  &ldquo;{item.quote}&rdquo;
                </blockquote>

                <div className="mt-6 flex items-center gap-3 border-t border-border pt-5">
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
                    <p className="text-body-sm font-semibold text-foreground">
                      {item.name}
                    </p>
                    <p className="text-caption text-muted-foreground">
                      {item.role}
                    </p>
                  </div>
                </div>
              </Card>
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
