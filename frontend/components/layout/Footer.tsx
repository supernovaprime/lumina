import Link from "next/link";
import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";
import { NewsletterForm } from "@/components/layout/NewsletterForm";

const quickLinks = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/#services" },
  { label: "Find a Car Wash", href: "/search" },
  { label: "About Us", href: "/#how-it-works" },
  { label: "Contact", href: "/#contact" },
];

const supportLinks = [
  { label: "Help & Support", href: "/support" },
  { label: "FAQs", href: "/support#faqs" },
  { label: "Terms & Conditions", href: "/legal#terms" },
  { label: "Privacy Policy", href: "/legal#privacy" },
];

const socials = [
  { label: "Facebook", Icon: Facebook },
  { label: "Instagram", Icon: Instagram },
  { label: "X", Icon: Twitter },
  { label: "YouTube", Icon: Youtube },
];

export function Footer() {
  return (
    <footer id="contact" className="border-t border-border bg-background">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-2 md:px-8 lg:grid-cols-4">
        <div>
          <Link href="/" className="flex items-center gap-2.5" aria-label="Lumina home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" className="h-9 w-9" />
            <span className="leading-none">
            <span className="block font-display text-xl font-extrabold tracking-tight text-foreground">
              Lumi<span className="text-gold-600 dark:text-gold-500">na</span>
            </span>
            <span className="block text-[10px] font-medium text-muted">
              Cleaner Cars. Brighter Days.
            </span>
            </span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
            Book trusted car washes near you in minutes. Compare services,
            pick a slot, and drive away clean.
          </p>
        </div>

        <nav aria-label="Quick links">
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
            Quick Links
          </h3>
          <ul className="mt-4 space-y-2.5">
            {quickLinks.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="text-sm text-white/60 transition hover:text-tertiary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Support">
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
            Support
          </h3>
          <ul className="mt-4 space-y-2.5">
            {supportLinks.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="text-sm text-white/60 transition hover:text-tertiary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
            Stay Connected
          </h3>
          <div className="mt-4 flex gap-2.5">
            {socials.map(({ label, Icon }) => (
              <span
                key={label}
                title={`${label} — coming soon`}
                aria-label={`${label} (coming soon)`}
                role="img"
                className="inline-flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-full border border-border text-muted"
              >
                <Icon size={16} />
              </span>
            ))}
          </div>
          <div className="mt-5">
            <NewsletterForm />
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-5 md:px-8">
          <p className="text-xs text-muted">
            &copy; 2025 Lumina. All rights reserved.
          </p>
          <p className="font-display text-xs font-semibold italic text-gold-700 dark:text-gold-500/90">
            Clean Rides, Better Days.
          </p>
        </div>
      </div>
    </footer>
  );
}
