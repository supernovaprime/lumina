import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { SectionHeading } from "@/components/landing/SectionHeading";
import { FadeIn } from "@/components/motion/FadeIn";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatGHS } from "@/lib/currency";
import { serviceCategories } from "@/lib/data/services";

export function ServicesGrid() {
  return (
    <section
      id="services"
      aria-labelledby="services-heading"
      className="scroll-mt-24 border-b border-border bg-background py-section"
    >
      <div className="mx-auto max-w-page px-4 md:px-8">
        <FadeIn>
          <SectionHeading
            titleId="services-heading"
            eyebrow="Services"
            title={
              <>
                Pick the clean your car{" "}
                <span className="text-brand">actually needs.</span>
              </>
            }
            description="From a quick exterior refresh to a full inside-and-out detail, every service is delivered by a verified partner. Prices shown are starting prices."
          />
        </FadeIn>

        <Stagger className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {serviceCategories.map((service) => (
            <StaggerItem key={service.slug}>
              <Link
                href={`/search?service=${service.backendFilter}`}
                className="group block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Card className="flex h-full flex-col overflow-hidden transition-colors duration-300 group-hover:border-brand/60">
                  <div className="relative aspect-[4/3] overflow-hidden bg-surface-sunken">
                    <Image
                      src={service.image}
                      alt={service.alt}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    {service.popular && (
                      <Badge
                        variant="action"
                        className="absolute left-3 top-3 shadow-1"
                      >
                        Popular
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-title font-bold tracking-tight text-foreground">
                        {service.title}
                      </h3>
                      <ArrowUpRight
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-brand"
                      />
                    </div>
                    <p className="mt-1.5 text-caption text-muted-foreground">
                      {service.copy}
                    </p>

                    <div className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-4">
                      <span className="text-label font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        From
                      </span>
                      <span className="font-mono text-body-sm font-medium text-foreground">
                        {formatGHS(service.fromPrice)}
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            </StaggerItem>
          ))}

          <StaggerItem>
            <Link
              href="/search"
              className="group flex h-full min-h-64 flex-col justify-between rounded-lg border border-lagoon-800 bg-lagoon-900 p-5 text-white transition-colors hover:bg-lagoon-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:p-6"
            >
              <span className="flex items-center justify-between text-label font-semibold uppercase tracking-[0.1em] text-lagoon-200">
                All services
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                />
              </span>
              <div>
                <p className="font-display text-h3 font-bold tracking-tight">
                  Not sure what your car needs?
                </p>
                <p className="mt-2 text-caption text-lagoon-100">
                  Compare every service, price and available time in one search.
                </p>
              </div>
            </Link>
          </StaggerItem>
        </Stagger>
      </div>
    </section>
  );
}
