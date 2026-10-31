import Link from "next/link";
import { MapPin, Twitter, Instagram, Linkedin, Mail } from "lucide-react";
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

export function Footer() {
  return (
    <footer id="contact" className="relative isolate scroll-mt-24 overflow-hidden border-t border-transparent">
      <div className="relative mx-auto max-w-[1440px] px-5 pb-8 pt-12 sm:px-8 lg:px-12 xl:px-20 lg:pt-16">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_0.8fr_1.1fr]">
          <div>
            <Link
              href="/"
              aria-label="Lumina home"
              className="inline-block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <BrandMark />
            </Link>
            <p className="mt-5 max-w-xs text-caption text-sand-200">
              Compare trusted car wash partners in Accra, see prices up front,
              pick a slot and drive away clean.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <p className="flex items-center gap-2 text-caption text-sand-200">
                <MapPin aria-hidden="true" className="size-4 text-gold-300" />
                Accra, Ghana
              </p>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <a
                href="#"
                aria-label="Twitter"
                className="flex size-9 items-center justify-center rounded-full border border-white/60 bg-white/60 text-teal-600 transition-colors duration-300 hover:border-teal-600/30 hover:bg-teal-600 hover:text-white dark:border-white/10 dark:bg-white/[0.06] dark:text-teal-300 dark:hover:border-teal-300/30 dark:hover:bg-teal-300 dark:hover:text-navy-950"
              >
                <Twitter aria-hidden="true" className="size-4" />
              </a>
              <a
                href="#"
                aria-label="Instagram"
                className="flex size-9 items-center justify-center rounded-full border border-white/60 bg-white/60 text-teal-600 transition-colors duration-300 hover:border-teal-600/30 hover:bg-teal-600 hover:text-white dark:border-white/10 dark:bg-white/[0.06] dark:text-teal-300 dark:hover:border-teal-300/30 dark:hover:bg-teal-300 dark:hover:text-navy-950"
              >
                <Instagram aria-hidden="true" className="size-4" />
              </a>
              <a
                href="#"
                aria-label="LinkedIn"
                className="flex size-9 items-center justify-center rounded-full border border-white/60 bg-white/60 text-teal-600 transition-colors duration-300 hover:border-teal-600/30 hover:bg-teal-600 hover:text-white dark:border-white/10 dark:bg-white/[0.06] dark:text-teal-300 dark:hover:border-teal-300/30 dark:hover:bg-teal-300 dark:hover:text-navy-950"
              >
                <Linkedin aria-hidden="true" className="size-4" />
              </a>
              <a
                href="mailto:hello@lumina.gh"
                aria-label="Email"
                className="flex size-9 items-center justify-center rounded-full border border-white/60 bg-white/60 text-teal-600 transition-colors duration-300 hover:border-teal-600/30 hover:bg-teal-600 hover:text-white dark:border-white/10 dark:bg-white/[0.06] dark:text-teal-300 dark:hover:border-teal-300/30 dark:hover:bg-teal-300 dark:hover:text-navy-950"
              >
                <Mail aria-hidden="true" className="size-4" />
              </a>
            </div>
          </div>

          <nav aria-label="Explore">
            <h3 className="text-label font-semibold uppercase tracking-[0.1em] text-foreground">
              Explore
            </h3>
            <ul className="mt-5 space-y-3">
              {exploreLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-caption text-sand-200 transition-colors hover:text-gold-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Support">
            <h3 className="text-label font-semibold uppercase tracking-[0.1em] text-foreground">
              Support
            </h3>
            <ul className="mt-5 space-y-3">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-caption text-sand-200 transition-colors hover:text-gold-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h3 className="text-label font-semibold uppercase tracking-[0.1em] text-foreground">
              Stay in the loop
            </h3>
            <div className="mt-5">
              <NewsletterForm />
            </div>
            <p className="mt-5 border-t border-transparent pt-4 text-caption text-sand-200">
              Need a hand with a booking?{" "}
              <Link
                href="/support"
                className="font-medium text-gold-300 underline decoration-gold-300/30 underline-offset-4 hover:decoration-gold-300"
              >
                Visit support
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-transparent pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-caption text-sand-200">
            &copy; {new Date().getFullYear()} Lumina. All rights reserved.
          </p>
          <p className="font-display text-title font-semibold text-gold-300">
            Cleaner cars. Brighter days.
          </p>
        </div>
      </div>
    </footer>
  );
}
