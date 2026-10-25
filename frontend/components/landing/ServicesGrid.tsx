import Link from "next/link";
import {
  Armchair,
  ArrowRight,
  Car,
  ShieldCheck,
  Sparkles,
  SprayCan,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";
import { formatGHS } from "@/lib/currency";
import {
  serviceCategories,
  type ServiceCategory,
} from "@/lib/data/services";

const icons: Record<ServiceCategory["icon"], LucideIcon> = {
  car: Car,
  sparkles: Sparkles,
  spray: SprayCan,
  shield: ShieldCheck,
  seat: Armchair,
};

export function ServicesGrid() {
  return (
    <section id="services" aria-labelledby="services-heading" className="relative">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2
              id="services-heading"
              className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl"
            >
              Our Services
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted md:text-base">
              Choose from a variety of professional car wash and detailing
              services.
            </p>
          </div>
          <Link
            href="/search"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground transition hover:border-tertiary hover:text-tertiary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            View All Services <ArrowRight size={15} />
          </Link>
        </Reveal>

        <ul className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {serviceCategories.map((service, i) => {
            const Icon = icons[service.icon];
            return (
              <li key={service.slug}>
                <Reveal delayMs={Math.min(i, 4) * 80} className="h-full">
                  <article className="group flex h-full flex-col overflow-hidden rounded-xl bg-background/85 shadow-sm backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-navy-950/10">
                    {/* Photo slot: branded tile until photoshoot assets land (TODO) */}
                    <div className="relative h-36 overflow-hidden bg-[linear-gradient(135deg,#005f73,#0a9396_60%,#ee9b00_130%)]">
                      <Icon
                        aria-hidden="true"
                        className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 text-white/70 transition duration-300 group-hover:scale-110"
                        strokeWidth={1.25}
                      />
                      <span
                        aria-hidden="true"
                        className="absolute -bottom-0 left-4 inline-flex h-9 w-9 translate-y-1/2 items-center justify-center rounded-full bg-gold-500 text-navy-950 shadow"
                      >
                        <Icon size={17} />
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-4 pt-6">
                      <h3 className="font-display text-base font-bold text-foreground">
                        {service.title}
                      </h3>
                      <p className="mt-1.5 line-clamp-2 flex-1 text-sm leading-relaxed text-muted">
                        {service.copy}
                      </p>
                      <div className="mt-4 flex items-center justify-between">
                        <p className="font-mono text-sm font-semibold text-foreground">
                          From {formatGHS(service.fromPrice)}
                        </p>
                        <Link
                          href={`/search?service=${service.backendFilter}`}
                          aria-label={`Find ${service.title} near you`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gold-500 text-navy-950 transition hover:bg-gold-400 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          <ArrowRight
                            size={16}
                            className="transition-transform group-hover:translate-x-0.5"
                          />
                        </Link>
                      </div>
                    </div>
                  </article>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
