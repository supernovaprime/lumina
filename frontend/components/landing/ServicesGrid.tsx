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
      className="relative isolate scroll-mt-24 overflow-hidden border-b border-transparent bg-[#f7f5ec] py-section dark:border-transparent dark:bg-[#071a20]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute inset-0 dark:hidden"
          style={{
            backgroundImage:
              "radial-gradient(75% 80% at 100% 0%, rgba(10,147,150,0.14), transparent 60%), radial-gradient(80% 80% at 0% 100%, rgba(238,155,0,0.12), transparent 62%), linear-gradient(125deg, #f6f5ec 0%, #eef4ef 48%, #f4f1e7 100%)",
          }}
        />
        <div className="absolute -right-32 top-16 size-[32rem] rounded-full bg-teal-300/20 blur-3xl dark:bg-teal-500/10" />
        <div className="absolute -left-24 bottom-0 size-[26rem] rounded-full bg-gold-300/16 blur-3xl dark:bg-gold-500/[0.08]" />
        <div className="absolute inset-0 bg-white/15 dark:hidden" />
      </div>

      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12 xl:px-20">
        <FadeIn>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading
              titleId="services-heading"
              eyebrow="Services"
              tone="atlas"
              title={
                <>
                  Pick the clean your car{" "}
                  <span className="text-gold-300">
                    actually needs.
                  </span>
                </>
              }
              description="From a quick exterior refresh to a full inside-and-out detail, every service is delivered by a verified partner. Prices shown are starting prices."
            />

            <div className="hidden shrink-0 items-center gap-3 rounded-full border border-white/60 bg-white/50 px-4 py-2.5 shadow-[0_8px_32px_-20px_rgba(0,18,25,0.25)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[0_8px_32px_-20px_rgba(0,0,0,0.7)] lg:flex">
              <span className="font-mono text-label font-semibold text-teal-600 dark:text-teal-300">
                {String(serviceCategories.length).padStart(2, "0")}
              </span>
              <span
                aria-hidden="true"
                className="h-4 w-px bg-white/60 dark:bg-white/10"
              />
              <span className="text-caption text-[#586c70] dark:text-[#a9bfc4]">
                service types to compare
              </span>
            </div>
          </div>
        </FadeIn>

        <Stagger className="mt-10 grid gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3">
          {serviceCategories.map((service) => (
            <StaggerItem key={service.slug}>
              <Link
                href={`/search?service=${service.backendFilter}`}
                className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f5ec] dark:focus-visible:ring-teal-300/60 dark:focus-visible:ring-offset-[#071a20]"
              >
                <Card className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/55 shadow-[0_24px_60px_-36px_rgba(0,18,25,0.45)] backdrop-blur-2xl transition-[background-color,border-color,box-shadow,transform] duration-300 group-hover:-translate-y-0.5 group-hover:border-teal-600/30 group-hover:bg-white/75 group-hover:shadow-[0_28px_64px_-34px_rgba(0,18,25,0.55)] motion-reduce:transform-none dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[0_24px_60px_-36px_rgba(0,0,0,0.85)] dark:group-hover:border-teal-300/30 dark:group-hover:bg-white/[0.08] dark:group-hover:shadow-[0_28px_64px_-34px_rgba(0,0,0,0.9)]">
                  <div className="relative aspect-[4/3] overflow-hidden bg-surface-sunken">
                    <Image
                      src={service.image}
                      alt={service.alt}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transform-none"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-navy-950/30 via-transparent to-transparent dark:from-[#06171d]/50"
                    />
                    {service.popular && (
                      <Badge
                        variant="action"
                        className="absolute left-3 top-3 rounded-full border-gold-500/30 bg-gold-200/90 text-gold-950 shadow-[0_8px_24px_-14px_rgba(238,155,0,0.7)] backdrop-blur-md dark:border-gold-400/30 dark:bg-gold-500/20 dark:text-gold-100"
                      >
                        Popular
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-title font-bold tracking-tight text-foreground dark:text-sand-50">
                        {service.title}
                      </h3>
                      <span
                        aria-hidden="true"
                        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/60 text-teal-600 transition-colors duration-300 group-hover:border-teal-600/30 group-hover:bg-teal-600 group-hover:text-white dark:border-white/10 dark:bg-white/[0.06] dark:text-teal-300 dark:group-hover:border-teal-300/30 dark:group-hover:bg-teal-300 dark:group-hover:text-navy-950 group-hover:animate-wobble"
                      >
                        <ArrowUpRight className="size-4" />
                      </span>
                    </div>
                    <p className="mt-2 text-caption text-muted-foreground dark:text-sand-300">
                      {service.copy}
                    </p>

                    <div className="mt-auto flex items-end justify-between gap-3 border-t border-transparent pt-4">
                      <span className="font-mono text-label font-medium uppercase tracking-[0.12em] text-muted-foreground dark:text-sand-300">
                        From
                      </span>
                      <span className="font-mono text-body-sm font-medium text-foreground dark:text-sand-50">
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
              className="group relative flex h-full min-h-64 flex-col justify-between overflow-hidden rounded-2xl border border-white/15 bg-navy-950/90 p-5 text-white shadow-[0_24px_60px_-30px_rgba(0,18,25,0.65)] backdrop-blur-2xl transition-colors duration-300 hover:bg-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f5ec] dark:border-white/10 dark:bg-[#040f13]/90 dark:hover:bg-[#07242b] dark:focus-visible:ring-offset-[#071a20] md:p-6"
            >
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[radial-gradient(120%_120%_at_100%_0%,rgba(10,147,150,0.35),transparent_55%),radial-gradient(100%_100%_at_0%_100%,rgba(238,155,0,0.18),transparent_55%)]"
              />

              <span className="relative flex items-center justify-between text-label font-semibold uppercase tracking-[0.1em] text-teal-200">
                All services
                <span className="flex size-9 items-center justify-center rounded-full border border-white/20 text-gold-200 transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transform-none">
                  <ArrowRight aria-hidden="true" className="size-4" />
                </span>
              </span>
              <div className="relative">
                <p className="font-display text-h3 font-bold tracking-tight text-balance">
                  Not sure what your car needs?
                </p>
                <p className="mt-2 text-caption text-[#a9bfc4]">
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
