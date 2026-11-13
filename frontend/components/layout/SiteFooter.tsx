import Link from "next/link";
import { ArrowUp, Facebook, Instagram, Twitter } from "lucide-react";

import { BrandMark } from "@/components/brand/BrandMark";
import { NewsletterForm } from "@/components/layout/NewsletterForm";

const columns = [
  {
    title: "Services",
    links: [
      { label: "Express wash", href: "#services" },
      { label: "Signature detail", href: "#services" },
      { label: "Interior reset", href: "#services" },
      { label: "Wax & polish", href: "#services" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#why-lumina" },
      { label: "Partner with us", href: "#contact" },
      { label: "Careers", href: "#contact" },
      { label: "Press", href: "#contact" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help centre", href: "#contact" },
      { label: "Contact", href: "#contact" },
      { label: "Safety", href: "#why-lumina" },
      { label: "Terms", href: "#contact" },
    ],
  },
];

const socials = [
  { label: "Instagram", href: "#contact", icon: Instagram },
  { label: "X", href: "#contact", icon: Twitter },
  { label: "Facebook", href: "#contact", icon: Facebook },
];

export function SiteFooter() {
  return (
    <footer
      id="contact"
      className="scroll-mt-24 border-t border-white/10 bg-sea-950 px-5 py-12 text-sky-300 sm:scroll-mt-28 sm:px-8 sm:py-16 lg:px-12"
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:gap-12">
          <div>
            <BrandMark tone="inverse" />
            <p className="mt-4 max-w-xs text-body-sm text-sky-300/90">
              Cleaner cars. Brighter days. Join the list for seasonal offers and
              new partner wash drops.
            </p>
            <NewsletterForm />
            <p className="mt-3 text-label text-sky-400/70">
              No spam. Unsubscribe any time.
            </p>
          </div>

          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="font-mono text-label font-medium uppercase tracking-[0.16em] text-paper">
                {column.title}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-body-sm text-sky-300/80 transition-colors hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-300/60"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-caption text-sky-400">
            © {new Date().getFullYear()} Lumina. Made in Accra.
          </p>

          <div className="flex items-center gap-1.5">
            {socials.map((social) => {
              const Icon = social.icon;

              return (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="inline-flex size-9 items-center justify-center rounded-full border border-white/10 text-sky-300 transition-colors hover:border-white/25 hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-300/60"
                >
                  <Icon aria-hidden="true" className="size-4" />
                </a>
              );
            })}

            <a
              href="#top"
              aria-label="Back to top"
              className="ml-1 inline-flex size-9 items-center justify-center rounded-full border border-white/10 text-sky-300 transition-colors hover:border-white/25 hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-300/60"
            >
              <ArrowUp aria-hidden="true" className="size-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
