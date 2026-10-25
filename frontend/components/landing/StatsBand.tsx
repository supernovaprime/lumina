import {
  CalendarCheck,
  ShieldCheck,
  Sparkles,
  Star,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";

type Stat = {
  icon: LucideIcon;
  value: string;
  label: string;
  sub: string;
};

const stats: Stat[] = [
  {
    icon: ShieldCheck,
    value: "120+",
    label: "Verified partners",
    sub: "Vetted wash businesses",
  },
  {
    icon: CalendarCheck,
    value: "12k+",
    label: "Washes booked",
    sub: "And counting",
  },
  {
    icon: Star,
    value: "4.9",
    label: "Average rating",
    sub: "From real reviews",
  },
  {
    icon: Sparkles,
    value: "3 min",
    label: "To book a slot",
    sub: "No calls, no queues",
  },
];

export function StatsBand() {
  return (
    <section aria-label="Lumina at a glance" className="relative">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <Reveal key={stat.label} delayMs={i * 70}>
              <div className="group h-full rounded-2xl bg-background/85 p-5 shadow-sm backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-navy-950/5">
                <div className="flex items-center justify-between">
                  <stat.icon
                    aria-hidden="true"
                    size={18}
                    className="text-tertiary"
                  />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                    Live
                  </span>
                </div>
                <p className="mt-4 font-display text-3xl font-extrabold tracking-tight text-foreground">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {stat.label}
                </p>
                <p className="text-xs text-muted">{stat.sub}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
