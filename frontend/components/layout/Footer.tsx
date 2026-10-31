import Link from "next/link";
import { MapPin } from "lucide-react";
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
    <footer id="contact" className="scroll-mt-24 border-t border-border bg-surface">
      <div className="mx-auto max-w-page px-4 pb-8 pt-12 md:px-8 md:pt-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_0.8fr_1.1fr]">
          <div>
            <Link
              href="/"
              aria-label="Lumina home"
              className="inline-block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <BrandMark />
            </Link>
            <p className="mt-5 max-w-xs text-caption text-muted-foreground">
              Compare trusted car wash partners in Accra, see prices up front,
              pick a slot and drive away clean.
            </p>
            <p className="mt-5 flex items-center gap-2 text-caption text-muted-foreground">
              <MapPin aria-hidden="true" className="size-4 text-brand" />
              Accra, Ghana
            </p>
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
                    className="text-caption text-muted-foreground transition-colors hover:text-brand"
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
                    className="text-caption text-muted-foreground transition-colors hover:text-brand"
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
            <p className="mt-5 border-t border-border pt-4 text-caption text-muted-foreground">
              Need a hand with a booking?{" "}
              <Link
                href="/support"
                className="font-medium text-brand underline decoration-brand/30 underline-offset-4 hover:decoration-brand"
              >
                Visit support
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-caption text-muted-foreground">
            &copy; {new Date().getFullYear()} Lumina. All rights reserved.
          </p>
          <p className="font-display text-title font-semibold text-brand">
            Cleaner cars. Brighter days.
          </p>
        </div>
      </div>
    </footer>
  );
}
