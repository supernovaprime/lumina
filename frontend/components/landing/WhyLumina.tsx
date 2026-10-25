import {
  BellRing,
  CalendarCheck,
  Check,
  LockKeyhole,
  ShieldCheck,
  Star,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";
import { formatGHS } from "@/lib/currency";

const verifiedChecks = [
  "Business identity and details verified",
  "Services and prices published up front",
  "Reviews only from completed bookings",
];

const slots = [
  { time: "09:00", note: "Open" },
  { time: "10:30", note: "Few left" },
  { time: "13:00", note: "Open" },
  { time: "15:30", note: "Open" },
];

const prices = [
  { name: "Basic wash", price: 50 },
  { name: "Premium wash", price: 80 },
  { name: "Interior add-on", price: 70 },
];

type Feature = {
  icon: LucideIcon;
  title: string;
  copy: string;
  className?: string;
};

const features: Feature[] = [
  {
    icon: LockKeyhole,
    title: "Secure checkout",
    copy: "Card, mobile money or pay on arrival. Sensitive details never touch our servers.",
    className: "md:col-span-1",
  },
  {
    icon: BellRing,
    title: "Gentle reminders",
    copy: "A friendly nudge 24 hours and 2 hours before your slot, so you never miss a wash.",
    className: "md:col-span-1",
  },
];

export function WhyLumina() {
  return (
    <section
      id="why-lumina"
      aria-labelledby="why-heading"
      className="relative"
    >
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24">
        <Reveal className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.22em] text-gold-700 dark:text-gold-400">
            THE LUMINA DIFFERENCE
          </p>
          <h2
            id="why-heading"
            className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl"
          >
            Built for a better wash day
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted md:text-base">
            Every detail is designed to remove the guesswork: verified partners,
            honest prices, real availability and bookings that actually stick.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Reveal className="md:col-span-2">
              <article className="group relative h-full overflow-hidden rounded-2xl bg-background/85 p-6 shadow-sm backdrop-blur-sm transition duration-300 hover:shadow-lg hover:shadow-navy-950/5 md:p-8">
              <div
                aria-hidden="true"
                className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-teal-500/10 blur-2xl transition group-hover:bg-teal-500/20"
              />
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/10 text-tertiary">
                <ShieldCheck size={20} />
              </span>
              <h3 className="mt-5 font-display text-xl font-bold tracking-tight text-foreground">
                Partners we would trust with our own cars
              </h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
                Each business is reviewed before it goes live, then held to the
                same standard with every service.
              </p>
              <ul className="mt-5 space-y-2.5">
                {verifiedChecks.map((check) => (
                  <li key={check} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300">
                      <Check size={12} strokeWidth={3} />
                    </span>
                    <span className="text-foreground/90">{check}</span>
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>

          <Reveal delayMs={80}>
            <article className="h-full rounded-2xl bg-background/85 p-6 shadow-sm backdrop-blur-sm transition duration-300 hover:shadow-lg hover:shadow-navy-950/5">
              <div className="flex items-center justify-between">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gold-500/10 text-gold-700 dark:text-gold-400">
                  <CalendarCheck size={20} />
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500 pulse-dot" />
                  Live
                </span>
              </div>
              <h3 className="mt-5 font-display text-lg font-bold tracking-tight text-foreground">
                Real availability
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                Slots update as bookings come in, so what you see is what you
                can book.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {slots.map((slot) => (
                  <span
                    key={slot.time}
                    className={`rounded-lg px-2.5 py-2 text-center ${
                      slot.note === "Few left"
                        ? "bg-gold-500/10 text-foreground"
                        : "bg-surface-2 text-foreground/80"
                    }`}
                  >
                    <span className="block font-mono text-sm font-semibold">
                      {slot.time}
                    </span>
                    <span className="block text-[10px] uppercase tracking-wide text-muted">
                      {slot.note}
                    </span>
                  </span>
                ))}
              </div>
            </article>
          </Reveal>

          <Reveal>
            <article className="h-full rounded-2xl bg-background/85 p-6 shadow-sm backdrop-blur-sm transition duration-300 hover:shadow-lg hover:shadow-navy-950/5">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/10 text-tertiary">
                <Wallet size={20} />
              </span>
              <h3 className="mt-5 font-display text-lg font-bold tracking-tight text-foreground">
                Transparent pricing
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                The price you see is the price you pay, confirmed before
                checkout.
              </p>
              <dl className="mt-4 space-y-2 border-t border-black/5 pt-4 text-sm dark:border-white/10">
                {prices.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between gap-3"
                  >
                    <dt className="text-muted">{item.name}</dt>
                    <dd className="font-mono font-semibold text-foreground">
                      {formatGHS(item.price)}
                    </dd>
                  </div>
                ))}
              </dl>
            </article>
          </Reveal>

          {features.map((feature, i) => (
            <Reveal key={feature.title} delayMs={80 + i * 60}>
              <article className="h-full rounded-2xl bg-background/85 p-6 shadow-sm backdrop-blur-sm transition duration-300 hover:shadow-lg hover:shadow-navy-950/5">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-foreground">
                  <feature.icon size={20} />
                </span>
                <h3 className="mt-5 font-display text-lg font-bold tracking-tight text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {feature.copy}
                </p>
                {feature.title === "Secure checkout" && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {["Card", "Mobile money", "Pay on arrival"].map((method) => (
                      <span
                        key={method}
                        className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-muted"
                      >
                        {method}
                      </span>
                    ))}
                  </div>
                )}
                {feature.title === "Gentle reminders" && (
                  <div className="mt-4 flex gap-2">
                    {["24h before", "2h before"].map((when) => (
                      <span
                        key={when}
                        className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-muted"
                      >
                        <BellRing size={11} /> {when}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            </Reveal>
          ))}

          <Reveal delayMs={120} className="md:col-span-3">
            <article className="flex flex-col items-start justify-between gap-5 rounded-2xl bg-background/85 p-6 shadow-sm backdrop-blur-sm transition duration-300 hover:shadow-lg hover:shadow-navy-950/5 sm:flex-row sm:items-center md:px-8">
              <div className="flex items-start gap-4">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-500/10 text-gold-700 dark:text-gold-400">
                  <Star size={20} fill="currentColor" strokeWidth={0} />
                </span>
                <div>
                  <h3 className="font-display text-lg font-bold tracking-tight text-foreground">
                    Reviews tied to real washes
                  </h3>
                  <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
                    Only customers with a completed booking can rate a business,
                    so the score you see reflects actual experience.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2">
                <span className="flex gap-0.5 text-gold-600 dark:text-gold-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={13}
                      fill="currentColor"
                      strokeWidth={0}
                      aria-hidden="true"
                    />
                  ))}
                </span>
                <span className="font-mono text-sm font-semibold text-foreground">
                  4.9 / 5
                </span>
              </div>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
