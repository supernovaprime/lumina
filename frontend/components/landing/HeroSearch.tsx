"use client";

import { useState } from "react";
import { MapPin, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { serviceCategories } from "@/lib/data/services";

const ANY_SERVICE = "any";

export function HeroSearch() {
  const [service, setService] = useState(ANY_SERVICE);

  return (
    <form
      action="/search"
      method="get"
      role="search"
      aria-label="Find a car wash"
      className="mt-8 rounded-lg border border-border bg-card p-3 shadow-1 md:p-4"
    >
      <input
        type="hidden"
        name="service"
        value={service === ANY_SERVICE ? "" : service}
      />

      <div className="grid gap-3 md:grid-cols-[1.15fr_1fr_auto] md:items-end">
        <div>
          <label
            htmlFor="hero-location"
            className="text-label font-semibold uppercase tracking-[0.08em] text-muted-foreground"
          >
            Where
          </label>
          <div className="relative mt-1.5">
            <MapPin
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand"
            />
            <Input
              id="hero-location"
              type="text"
              name="location"
              placeholder="e.g. East Legon, Accra"
              autoComplete="address-level2"
              enterKeyHint="search"
              className="bg-surface-raised pl-9"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="hero-service"
            className="text-label font-semibold uppercase tracking-[0.08em] text-muted-foreground"
          >
            Service
          </label>
          <div className="relative mt-1.5">
            <Sparkles
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-marigold-600 dark:text-marigold-300"
            />
            <Select value={service} onValueChange={setService}>
              <SelectTrigger id="hero-service" className="pl-9">
                <SelectValue placeholder="Any service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY_SERVICE}>Any service</SelectItem>
                {serviceCategories.map((item) => (
                  <SelectItem key={item.slug} value={item.backendFilter}>
                    {item.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button type="submit" size="lg" className="h-12 w-full md:w-auto">
          <Search aria-hidden="true" className="size-4" />
          Find a wash
        </Button>
      </div>

      <p className="mt-3 text-caption text-muted-foreground">
        Compare verified partners, prices and available times. No account needed
        to browse.
      </p>
    </form>
  );
}
