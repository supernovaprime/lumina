"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Search, X } from "lucide-react";

import { BrandMark } from "@/components/brand/BrandMark";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const navLinks = [
  { label: "Home", href: "/", current: true },
  { label: "Services", href: "/services" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Why Lumina", href: "#why-lumina" },
  { label: "Support", href: "/support" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="relative z-30">
      <div className="relative flex items-center justify-between gap-3 px-5 py-5 sm:px-8 lg:px-12 lg:py-6">
        <BrandMark />

        <nav
          aria-label="Primary"
          className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-8 lg:flex"
        >
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              aria-current={link.current ? "page" : undefined}
              className="group relative text-caption font-medium text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:text-foreground"
            >
              {link.label}
              <span className="absolute -bottom-2 left-1/2 size-1 -translate-x-1/2 scale-0 rounded-full bg-orchid-400 transition-transform group-hover:scale-100 group-aria-[current=page]:scale-100" />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-full px-3 py-2 text-caption font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/search"
            aria-label="Search car washes"
            className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-surface/40 text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
          >
            <Search aria-hidden="true" className="size-4" />
          </Link>
          <ThemeToggle />
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-surface/40 text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 lg:hidden dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
          >
            {open ? (
              <X aria-hidden="true" className="size-4" />
            ) : (
              <Menu aria-hidden="true" className="size-4" />
            )}
          </button>
        </div>
      </div>

      {open ? (
        <div id="mobile-nav" className="border-t border-border/60 px-5 pb-5 lg:hidden">
          <nav aria-label="Mobile" className="flex flex-col py-2">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                aria-current={link.current ? "page" : undefined}
                className="rounded-lg px-3 py-3 text-body-sm font-medium text-muted-foreground transition-colors hover:bg-surface hover:text-foreground aria-[current=page]:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="mt-1 rounded-lg px-3 py-3 text-body-sm font-medium text-orchid-600 transition-colors hover:bg-surface dark:text-orchid-300"
            >
              Sign in
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
