import Image from "next/image";
import { Star } from "lucide-react";

import { SectionFrame, SectionHeading } from "@/components/landing/SectionFrame";
import { glassCardClass } from "@/components/ui/glass-card";

const testimonials = [
  {
    quote:
      "Booked a full detail in under a minute. The car looked showroom-new when I picked it up.",
    name: "Ama Serwaa",
    location: "East Legon",
    avatar: "/assets/avatar-ama-serwaa.jpg",
  },
  {
    quote:
      "The upfront price is what sold me. No haggling at the bay, and the slot started on time.",
    name: "Kwame Mensah",
    location: "Osu",
    avatar: "/assets/avatar-kwame-mensah.jpg",
  },
  {
    quote:
      "The interior reset saved my seats after a beach weekend. I've already booked again.",
    name: "Efua Boateng",
    location: "Labone",
    avatar: "/assets/avatar-efua-boateng.jpg",
  },
];

function Stars() {
  return (
    <div
      className="flex items-center gap-0.5 text-sea-400"
      aria-label="5 out of 5 stars"
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          aria-hidden="true"
          className="size-3.5 fill-current"
        />
      ))}
    </div>
  );
}

export function Testimonials() {
  return (
    <SectionFrame id="testimonials" tone="sunken">
      <SectionHeading
        eyebrow="Drivers"
        title={
          <>
            Loved by drivers across{" "}
            <em className="font-normal italic text-sea-600 dark:text-sea-300">
              Accra.
            </em>
          </>
        }
        description="Real bookings, real cars, real shine. Here's what drivers say after their first wash."
      />

      <div className="mt-12 grid gap-4 lg:grid-cols-12">
        <figure
          className={glassCardClass(
            "flex flex-col p-6 hover:border-sea-500/35 sm:p-8 lg:col-span-7"
          )}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-6 top-3 font-display text-8xl leading-none text-sea-500/10"
          >
            “
          </span>
          <Stars />
          <blockquote className="mt-5 flex-1 text-pretty font-display text-2xl leading-snug text-foreground sm:text-[1.75rem]">
            “{testimonials[0].quote}”
          </blockquote>
          <figcaption className="mt-6 flex items-center gap-3 border-t border-white/40 pt-5 dark:border-white/10">
            <Image
              src={testimonials[0].avatar}
              alt=""
              width={44}
              height={44}
              className="size-11 rounded-full object-cover"
            />
            <div>
              <p className="text-caption font-semibold text-foreground">
                {testimonials[0].name}
              </p>
              <p className="text-label text-muted-foreground">
                {testimonials[0].location}
              </p>
            </div>
          </figcaption>
        </figure>

        <figure
          className={glassCardClass(
            "flex flex-col p-6 hover:border-sea-500/35 lg:col-span-5"
          )}
        >
          <Stars />
          <blockquote className="mt-5 flex-1 text-pretty text-body-sm leading-relaxed text-foreground">
            “{testimonials[1].quote}”
          </blockquote>
          <figcaption className="mt-6 flex items-center gap-3 border-t border-white/40 pt-5 dark:border-white/10">
            <Image
              src={testimonials[1].avatar}
              alt=""
              width={40}
              height={40}
              className="size-10 rounded-full object-cover"
            />
            <div>
              <p className="text-caption font-semibold text-foreground">
                {testimonials[1].name}
              </p>
              <p className="text-label text-muted-foreground">
                {testimonials[1].location}
              </p>
            </div>
          </figcaption>
        </figure>

        <figure
          className={glassCardClass(
            "flex flex-col gap-6 p-6 hover:border-sea-500/35 sm:grid sm:grid-cols-[1fr_auto] sm:items-center sm:gap-8 sm:p-8 lg:col-span-12"
          )}
        >
          <div>
            <Stars />
            <blockquote className="mt-4 text-pretty text-body-sm leading-relaxed text-foreground sm:text-body">
              “{testimonials[2].quote}”
            </blockquote>
            <figcaption className="mt-5 flex items-center gap-3">
              <Image
                src={testimonials[2].avatar}
                alt=""
                width={40}
                height={40}
                className="size-10 rounded-full object-cover"
              />
              <div>
                <p className="text-caption font-semibold text-foreground">
                  {testimonials[2].name}
                </p>
                <p className="text-label text-muted-foreground">
                  {testimonials[2].location}
                </p>
              </div>
            </figcaption>
          </div>

          <div className="flex items-center gap-4 border-t border-white/40 pt-5 dark:border-white/10 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
            <p className="font-display text-4xl font-semibold leading-none text-foreground">
              4.9
            </p>
            <div>
              <Stars />
              <p className="mt-1.5 text-caption text-muted-foreground">
                1,200+ cars detailed
              </p>
            </div>
          </div>
        </figure>
      </div>
    </SectionFrame>
  );
}
