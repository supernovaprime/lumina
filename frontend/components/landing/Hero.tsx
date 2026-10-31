import Link from "next/link";
import {
  ArrowRight,
  CarFront,
  Check,
  MapPin,
  Route,
} from "lucide-react";
import { TypewriterText } from "@/components/landing/TypewriterText";

const promises = [
  "Verified partners",
  "Prices up front",
  "No phone calls",
];

const rotatingPhrases = [
  "Drive clean.",
  "Shine brighter.",
  "Go further.",
];

type HeroProps = {
  bookingHref?: string;
};

export function Hero({ bookingHref = "/search" }: HeroProps) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative text-navy-950 dark:text-[#eef6f4]"
    >
      <div className="relative mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-12 xl:px-20">
        {/* Section masthead */}
        <div className="flex items-center justify-between gap-4 rounded-full border border-white/60 bg-white/50 px-4 py-2.5 shadow-[0_8px_32px_-16px_rgba(0,18,25,0.25)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[0_8px_32px_-16px_rgba(0,0,0,0.7)]">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="h-[3px] w-6 bg-teal-600 dark:bg-teal-300"
            />
            <span className="text-[10px] font-medium tracking-[0.16em] sm:text-[11px]">
              CAR WASH BOOKING
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 text-xs font-medium">
            <MapPin
              aria-hidden="true"
              className="size-3.5 text-teal-600 dark:text-teal-300"
            />
            Accra, Ghana
          </div>
        </div>

        {/* Main hero */}
        <div className="grid items-center gap-12 py-12 md:py-14 lg:grid-cols-[1fr_1.05fr] lg:gap-12 lg:py-10">
          <div>
            <h1
              id="hero-heading"
              className="text-[clamp(2.75rem,5.3vw,4.75rem)] leading-[1.08] font-display font-semibold tracking-[-0.055em]"
            >
              <span className="block">Find a wash.</span>
              <span className="block">Book the slot.</span>
              <span className="block text-teal-600 dark:text-teal-300">
                <TypewriterText phrases={rotatingPhrases} />
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-base leading-[1.65] text-[#586c70] dark:text-[#a9bfc4] xl:text-lg">
              Compare trusted car wash partners in Accra, see prices
              before you book, and lock a time that fits your day.
            </p>

            <Link
              href={bookingHref}
              className="group mt-8 inline-flex min-h-[60px] items-center justify-center gap-7 rounded-lg bg-teal-600 px-6 py-4 text-base font-semibold text-white shadow-[0_12px_32px_-12px_rgba(10,147,150,0.65)] transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-600 dark:bg-teal-400 dark:text-navy-950 dark:shadow-[0_12px_32px_-12px_rgba(61,180,186,0.45)] dark:hover:bg-teal-300 dark:focus-visible:outline-teal-300"
            >
              Find a car wash
              <ArrowRight
                aria-hidden="true"
                className="size-5 transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
              />
            </Link>

            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-3">
              {promises.map((promise) => (
                <li
                  key={promise}
                  className="flex items-center gap-2 text-[13px] font-medium"
                >
                  <Check
                    aria-hidden="true"
                    className="size-4 shrink-0 text-teal-600 dark:text-teal-300"
                    strokeWidth={2}
                  />
                  {promise}
                </li>
              ))}
            </ul>
          </div>

          <AtlasRoute />
        </div>
      </div>
    </section>
  );
}

function AtlasRoute() {
  return (
    <div className="relative isolate overflow-hidden rounded-3xl border border-white/60 bg-[#eaf0eb]/80 shadow-[0_24px_64px_-28px_rgba(0,18,25,0.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#0b2026]/60 dark:shadow-[0_24px_64px_-28px_rgba(0,0,0,0.85)]">
      {/* Map masthead */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3.5 py-2.5 text-xs font-semibold shadow-[0_8px_24px_-16px_rgba(0,18,25,0.4)] backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:text-sand-50">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-teal-600 dark:bg-teal-300"
          />
          Explore Accra
        </div>

        <div
          aria-hidden="true"
          className="flex w-8 flex-col items-center gap-1 text-navy-800 dark:text-teal-200"
        >
          <span className="text-[9px] font-semibold">N</span>
          <svg width="14" height="18" viewBox="0 0 14 18">
            <path d="M7 0 14 18 7 13 0 18Z" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* Decorative, illustrative map — not live navigation */}
      <svg
        viewBox="0 0 632 450"
        role="img"
        aria-label="Illustrative Accra map showing a route to a car wash, with labels for Dzorwulu, Airport Residential, Cantonments, and Osu."
        className="block h-auto w-full"
        fill="none"
      >
        {/* City blocks */}
        <g className="fill-[#dfe8e1] dark:fill-[#14323a]">
          <rect x="18" y="203" width="104" height="62" rx="10" />
          <rect x="374" y="88" width="75" height="45" rx="10" />
          <rect x="466" y="250" width="58" height="64" rx="10" />
          <rect x="355" y="359" width="44" height="60" rx="8" />
        </g>

        {/* Green spaces */}
        <g className="fill-[#d0dfd3] dark:fill-[#0f2b24]">
          <rect x="475" y="82" width="130" height="54" rx="24" />
          <path d="M35 450c0-19 13-31 36-35l27-5c17-3 26 9 26 23v17Z" />
        </g>

        {/* Main roads */}
        <g strokeLinejoin="round" strokeLinecap="round">
          <path
            d="M126-20V156H174L345 315H542V288Q542 275 532 265L345 86V55L160 230H-20"
            className="stroke-[#d5dfd8] dark:stroke-[#1d444c]"
            strokeWidth="18"
          />
          <path
            d="M126-20V156H174L345 315H542V288Q542 275 532 265L345 86V55L160 230H-20"
            className="stroke-white dark:stroke-[#28525a]"
            strokeWidth="14"
          />

          <g className="stroke-white dark:stroke-[#2b565e]" strokeWidth="6">
            <path d="M0 230H156L242 150H450" />
            <path d="M222 172 364 300" />
            <path d="M276 121 421 252" />
            <path d="M552 103V165" />
            <path d="M122 417V450" />
            <path d="M355 336H415" />
            <path d="M215 247 294 174" />
          </g>
        </g>

        {/* District labels */}
        <g
          className="fill-[#005f73] dark:fill-[#79cfd3]"
          fontSize="10"
          fontWeight="600"
          letterSpacing="1.1"
        >
          <text x="46" y="168">DZORWULU</text>
          <text x="284" y="122">AIRPORT RESIDENTIAL</text>
          <text x="441" y="379">CANTONMENTS</text>
          <text x="273" y="441">OSU</text>
        </g>

        {/* Discovery route */}
        <path
          d="M151 390H203Q217 390 228 380L387 244Q410 224 438 224"
          className="stroke-white dark:stroke-[#0a262c]"
          strokeWidth="13"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M151 390H203Q217 390 228 380L387 244Q410 224 438 224"
          className="stroke-[#0a9396] dark:stroke-[#3db4ba]"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Origin */}
        <circle
          cx="151"
          cy="390"
          r="18"
          className="fill-[#0a9396] dark:fill-[#3db4ba]"
          opacity=".1"
        />
        <circle
          cx="151"
          cy="390"
          r="8"
          fill="#001219"
          stroke="white"
          strokeWidth="4"
        />

        {/* Nearby locations */}
        <WashMarker x={81} y={261} />
        <WashMarker x={518} y={143} />

        {/* Highlighted destination */}
        <circle
          cx="438"
          cy="224"
          r="38"
          className="fill-[#ee9b00] dark:fill-[#e5ad45]"
          opacity=".12"
        />
        <rect
          x="412"
          y="198"
          width="52"
          height="52"
          rx="17"
          className="fill-[#ee9b00] dark:fill-[#e5ad45]"
        />
        <CarFront
          x={425}
          y={211}
          width={26}
          height={26}
          stroke="#001219"
          strokeWidth={1.6}
          aria-hidden="true"
        />

        {/* Destination label */}
        <rect
          x="373"
          y="163"
          width="112"
          height="27"
          rx="13.5"
          className="fill-[#001219] dark:fill-[#e9d8a6]"
        />
        <text
          x="429"
          y="180"
          textAnchor="middle"
          className="fill-white dark:fill-[#001219]"
          fontSize="11"
          fontWeight="500"
        >
          Your next clean
        </text>
      </svg>

      {/* Route caption */}
      <div className="relative z-10 mx-4 mt-4 mb-4 rounded-2xl border border-white/10 bg-navy-950/90 p-5 text-white shadow-[0_16px_40px_-20px_rgba(0,18,25,0.7)] backdrop-blur-xl dark:bg-[#040f13]/70 sm:mx-6 sm:mt-6 sm:mb-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-lg leading-snug font-medium tracking-tight xl:text-[21px]">
              Make clean part of your route.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[#b6c8ca]">
              Find a wash that fits your day.
            </p>
          </div>

          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/20">
            <Route
              aria-hidden="true"
              className="size-5 text-gold-200"
              strokeWidth={1.6}
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 text-[10px]">
          <span className="flex items-center gap-2 text-[#b6c8ca]">
            <span
              aria-hidden="true"
              className="h-0.5 w-4 bg-teal-600 dark:bg-teal-300"
            />
            Illustrative route
          </span>
          <span className="tracking-widest text-gold-200">
            ACCRA / GH
          </span>
        </div>
      </div>
    </div>
  );
}

function WashMarker({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width="34"
        height="34"
        rx="12"
        className="fill-white stroke-[#d9e2df] dark:fill-[#0b2026] dark:stroke-[#2d5a62]"
      />
      <CarFront
        x={x + 8}
        y={y + 8}
        width={18}
        height={18}
        className="stroke-[#005f73] dark:stroke-[#79cfd3]"
        strokeWidth={1.6}
        aria-hidden="true"
      />
    </g>
  );
}
