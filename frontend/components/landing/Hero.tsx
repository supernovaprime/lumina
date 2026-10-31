import { CheckCircle2, MapPin } from "lucide-react";
import { AtlasRoute } from "@/components/landing/AtlasRoute";
import { HeroSearch } from "@/components/landing/HeroSearch";
import { Badge } from "@/components/ui/badge";

const promises = [
  "Verified partners",
  "Prices up front",
  "No phone calls",
];

export function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="border-b border-border bg-background"
    >
      <div className="mx-auto grid max-w-page gap-12 px-4 py-12 md:px-8 md:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:py-20">
        <div>
          <Badge variant="brand" className="gap-1.5 px-3 py-1">
            <MapPin aria-hidden="true" className="size-3.5" />
            Accra · Verified car care
          </Badge>

          <h1
            id="hero-heading"
            className="mt-5 max-w-[13ch] font-display text-display font-bold tracking-[-0.03em] text-foreground text-balance"
          >
            Find a wash. Book the slot.{" "}
            <span className="text-brand">
              Drive clean<span className="text-primary">.</span>
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-body text-muted-foreground md:text-lg">
            Compare trusted car wash partners in Accra, see prices before you
            book, and lock a time that fits your day.
          </p>

          <HeroSearch />

          <ul className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
            {promises.map((item) => (
              <li
                key={item}
                className="flex items-center gap-1.5 text-caption font-medium text-muted-foreground"
              >
                <CheckCircle2
                  aria-hidden="true"
                  className="size-4 text-brand"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:pl-4">
          <AtlasRoute />
        </div>
      </div>
    </section>
  );
}
