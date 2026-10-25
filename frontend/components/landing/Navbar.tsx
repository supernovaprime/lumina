"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, Search, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl transition-shadow ${
        scrolled ? "shadow-lg shadow-navy-950/10" : ""
      }`}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 md:h-20 md:px-8"
      >
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

        <span className="ml-6 hidden items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs font-medium text-muted lg:inline-flex">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-teal-500 pulse-dot"
          />
          120+ verified partners
        </span>

        <div className="ml-auto flex items-center gap-2.5">
          <Link
            href="/search"
            aria-label="Search car washes"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Search size={18} />
          </Link>
          <ThemeToggle />
          <Link
            href="/login"
            className="hidden rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground transition hover:border-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:inline-block"
          >
            Log In
          </Link>
          <Link
            href="/register"
            className="hidden rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-fg transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:inline-block"
          >
            Sign Up
          </Link>
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:hidden"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-border bg-background px-4 pb-5 pt-4 sm:hidden">
          <div className="flex gap-2.5">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-full border border-border px-5 py-2.5 text-center text-sm font-semibold text-foreground"
            >
              Log In
            </Link>
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-full bg-primary px-5 py-2.5 text-center text-sm font-semibold text-primary-fg"
            >
              Sign Up
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
