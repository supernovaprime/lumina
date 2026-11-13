import Link from "next/link";
import {
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Twitter,
} from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { NewsletterForm } from "@/components/layout/NewsletterForm";

const exploreLinks = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/#services" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Why Lumina", href: "/#why-lumina" },
  { label: "Find a car wash", href: "/search" },
];

const supportLinks = [
  { label: "Help & support", href: "/support" },
  { label: "FAQs", href: "/support#faqs" },
  { label: "Terms & conditions", href: "/legal#terms" },
  { label: "Privacy policy", href: "/legal#privacy" },
];

const socialLinks = [
  { label: "Twitter", href: "#", icon: Twitter },
  { label: "Instagram", href: "#", icon: Instagram },
  { label: "LinkedIn", href: "#", icon: Linkedin },
  { label: "Email", href: "mailto:hello@lumina.gh", icon: Mail },
];

export function Footer() {
  return (
    <footer
      id="contact"
      className="relative isolate scroll-mt-24 overflow-hidden border-t border-border/70 bg-[#f7f5ec] text-foreground dark:border-white/10 dark:bg-[#071a20]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[linear-gradient(125deg,#f6f5ec_0%,#eef4ef_48%,#f4f1e7_100%)] dark:hidden" />
        <div className="absolute inset-0 hidden bg-gradient-to-br from-navy-950 via-teal-950 to-lagoon-950 dark:block" />
        <div className="absolute inset-0 bg-[radial-gradient(90%_80%_at_100%_0%,rgba(10,147,150,0.12),transparent_60%),radial-gradient(80%_80%_at_0%_100%,rgba(238,155,0,0.10),transparent_60%)] dark:hidden" />
        <div className="absolute inset-0 hidden bg-[radial-gradient(90%_80%_at_100%_0%,rgba(10,147,150,0.28),transparent_62%),radial-gradient(80%_80%_at_0%_100%,rgba(238,155,0,0.16),transparent_60%)] dark:block" />
        <div className="absolute -left-28 top-8 size-[30rem] rounded-full bg-teal-500/10 blur-3xl dark:bg-teal-500/10" />
        <div className="absolute -right-24 bottom-0 size-[26rem] rounded-full bg-gold-400/15 blur-3xl dark:bg-gold-500/10" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-500/40 to-transparent dark:via-gold-400/60" />
      </div>

      <div className="relative mx-auto max-w-[1440px] px-5 pb-8 pt-14 sm:px-8 lg:px-12 lg:pt-16 xl:px-20">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_0.8fr_1.1fr]">
          <div>
            <Link
              href="/"
              aria-label="Lumina home"
              className="inline-block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/50 dark:focus-visible:ring-gold-400/60"
            >
              <BrandMark tagline={false} />
            </Link>
            <p className="mt-5 max-w-xs text-caption leading-relaxed text-muted-foreground dark:text-sand-200/80">
              Compare trusted car wash partners in Accra, see prices up front,
              pick a slot and drive away clean.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/60 px-3.5 py-1.5 text-caption text-muted-foreground backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05] dark:text-sand-200">
              <MapPin
                aria-hidden="true"
                className="size-4 text-gold-600 dark:text-gold-300"
              />
              Accra, Ghana
            </div>
            <div className="mt-6 flex items-center gap-2.5">
              {socialLinks.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex size-9 items-center justify-center rounded-full border border-white/70 bg-white/60 text-teal-700 transition-all duration-300 hover:-translate-y-0.5 hover:border-teal-700/20 hover:bg-teal-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/50 motion-reduce:transform-none dark:border-white/10 dark:bg-white/[0.05] dark:text-teal-200 dark:hover:border-gold-400/40 dark:hover:bg-gold-500 dark:hover:text-navy-950 dark:focus-visible:ring-gold-400/60"
                >
                  <Icon aria-hidden="true" className="size-4" />
                </a>
              ))}
            </div>
          </div>

          <nav aria-label="Explore">
            <h3 className="text-label font-semibold uppercase tracking-[0.1em] text-gold-700 dark:text-gold-300">
              Explore
            </h3>
            <ul className="mt-5 space-y-3">
              {exploreLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="rounded-sm text-caption text-muted-foreground transition-colors hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/50 dark:text-sand-200/80 dark:hover:text-gold-200 dark:focus-visible:ring-gold-400/60"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Support">
            <h3 className="text-label font-semibold uppercase tracking-[0.1em] text-gold-700 dark:text-gold-300">
              Support
            </h3>
            <ul className="mt-5 space-y-3">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="rounded-sm text-caption text-muted-foreground transition-colors hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/50 dark:text-sand-200/80 dark:hover:text-gold-200 dark:focus-visible:ring-gold-400/60"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h3 className="text-label font-semibold uppercase tracking-[0.1em] text-gold-700 dark:text-gold-300">
              Stay in the loop
            </h3>
            <div className="mt-5 rounded-2xl border border-white/70 bg-white/60 p-4 shadow-[0_18px_48px_-32px_rgba(0,18,25,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none">
              <NewsletterForm />
            </div>
            <p className="mt-5 text-caption text-muted-foreground dark:text-sand-200/80">
              Need a hand with a booking?{" "}
              <Link
                href="/support"
                className="font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-4 transition-colors hover:text-teal-800 hover:decoration-teal-800 dark:text-gold-300 dark:decoration-gold-300/30 dark:hover:text-gold-200 dark:hover:decoration-gold-200"
              >
                Visit support
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-border/70 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <p className="text-caption text-muted-foreground dark:text-sand-300">
              &copy; {new Date().getFullYear()} Lumina. All rights reserved.
            </p>
            <span
              aria-hidden="true"
              className="hidden h-3 w-px bg-border sm:block dark:bg-white/15"
            />
            <p className="text-caption text-muted-foreground/80 dark:text-sand-300/70">
              Accra, Ghana
            </p>
          </div>
          <p className="bg-gradient-to-r from-gold-700 via-gold-600 to-teal-700 bg-clip-text font-display text-h3 font-semibold tracking-tight text-transparent dark:from-gold-200 dark:via-gold-300 dark:to-teal-200">
            Cleaner cars. Brighter days.
          </p>
        </div>
      </div>
    </footer>
  );
}
