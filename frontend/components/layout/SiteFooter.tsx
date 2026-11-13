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

const legalLinks = [
  { label: "Privacy", href: "#contact" },
  { label: "Terms", href: "#contact" },
];

export function SiteFooter() {
  return (
    <footer
      id="contact"
      className="relative scroll-mt-24 overflow-hidden border-t border-border/60 bg-surface-sunken/45 px-5 py-14 text-foreground sm:scroll-mt-28 sm:px-8 sm:py-16 lg:px-12 dark:border-white/10 dark:bg-sea-950 dark:text-sky-300"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sea-400/50 to-transparent dark:via-sea-300/30"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-40 size-96 rounded-full bg-sea-300/20 blur-3xl dark:bg-sea-500/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-24 size-80 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-400/[0.04]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-12 right-2 select-none font-display text-[8rem] italic leading-none text-sea-950/[0.035] dark:text-white/[0.025] sm:text-[12rem]"
      >
        Lumina
      </span>

      <div className="relative mx-auto w-full max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
          <div>
            <BrandMark />
            <h2 className="mt-6 max-w-lg text-balance font-display text-h2 font-semibold text-foreground dark:text-paper">
              Cleaner cars.{" "}
              <em className="font-normal italic text-sea-600 dark:text-sea-300">
                Brighter days.
              </em>
            </h2>
            <p className="mt-4 max-w-sm text-body-sm leading-relaxed text-muted-foreground dark:text-sky-300/80">
              Join the list for seasonal offers and new partner wash drops
              across Accra.
            </p>
            <NewsletterForm />
            <p className="mt-3 text-label text-muted-foreground dark:text-sky-400/70">
              No spam. Unsubscribe any time.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:pt-2">
            {columns.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <h2 className="font-mono text-label font-medium uppercase tracking-[0.16em] text-foreground dark:text-paper">
                  {column.title}
                </h2>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-body-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500/50 dark:text-sky-300/80 dark:hover:text-paper dark:focus-visible:ring-sea-300/60"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-5 border-t border-border/60 pt-6 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-caption text-muted-foreground dark:text-sky-400">
            <p>© {new Date().getFullYear()} Lumina.</p>
            <span
              aria-hidden="true"
              className="hidden size-1 rounded-full bg-current sm:block"
            />
            <p>Made in Accra.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {legalLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-caption text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500/50 dark:text-sky-300/80 dark:hover:text-paper dark:focus-visible:ring-sea-300/60"
              >
                {link.label}
              </Link>
            ))}

            <span
              aria-hidden="true"
              className="mx-1 h-4 w-px bg-border dark:bg-white/10"
            />

            {socials.map((social) => {
              const Icon = social.icon;

              return (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="inline-flex size-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:border-sea-500/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500/50 dark:border-white/10 dark:text-sky-300 dark:hover:border-white/25 dark:hover:text-paper dark:focus-visible:ring-sea-300/60"
                >
                  <Icon aria-hidden="true" className="size-4" />
                </a>
              );
            })}

            <a
              href="#top"
              aria-label="Back to top"
              className="group ml-1 inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-2 text-caption font-medium text-muted-foreground transition-colors hover:border-sea-500/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500/50 dark:border-white/10 dark:text-sky-300 dark:hover:border-white/25 dark:hover:text-paper dark:focus-visible:ring-sea-300/60"
            >
              Back to top
              <ArrowUp
                aria-hidden="true"
                className="size-3.5 transition-transform duration-200 group-hover:-translate-y-0.5"
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
