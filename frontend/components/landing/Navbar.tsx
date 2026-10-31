import Link from "next/link";
import { ArrowRight, MapPin, Menu } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

const links = [
  { label: "Services", href: "#services" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Why Lumina", href: "#why-lumina" },
  { label: "Reviews", href: "#testimonials" },
  { label: "Contact", href: "#contact" },
];

export function Navbar() {
  return (
    <>
      <div className="border-b border-border bg-surface-sunken">
        <div className="mx-auto flex max-w-page items-center justify-between gap-4 px-4 py-2 text-caption text-muted-foreground md:px-8">
          <p className="flex items-center gap-1.5">
            <MapPin aria-hidden="true" className="size-3.5 text-brand" />
            Accra, Ghana
          </p>
          <p className="hidden sm:block">
            Verified partners · Prices shown before you book
          </p>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <nav
          aria-label="Primary"
          className="mx-auto flex h-18 max-w-page items-center gap-6 px-4 md:px-8"
        >
          <Link
            href="/"
            aria-label="Lumina home"
            className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BrandMark tagline={false} />
          </Link>

          <div className="mx-auto hidden items-center gap-1 lg:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-sm px-3 py-2 text-body-sm font-medium text-muted-foreground transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <ThemeToggle />
            <Link
              href="/login"
              className="hidden rounded-sm px-3 py-2 text-body-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:inline-flex"
            >
              Log in
            </Link>
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/search">
                Find a wash
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </Button>

            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Open menu"
                >
                  <Menu aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="mt-12">
                  <BrandMark />
                </div>

                <nav aria-label="Mobile" className="mt-10 flex flex-col">
                  {links.map((link) => (
                    <SheetClose asChild key={link.href}>
                      <Link
                        href={link.href}
                        className="flex min-h-12 items-center justify-between border-b border-border py-3 text-title font-semibold text-foreground transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {link.label}
                        <ArrowRight
                          aria-hidden="true"
                          className="size-4 text-muted-foreground"
                        />
                      </Link>
                    </SheetClose>
                  ))}
                </nav>

                <div className="mt-auto grid gap-2 pt-8">
                  <SheetClose asChild>
                    <Link
                      href="/search"
                      className={buttonVariants({ size: "lg" })}
                    >
                      Find a wash
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      href="/login"
                      className={buttonVariants({ variant: "outline", size: "lg" })}
                    >
                      Log in
                    </Link>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </header>
    </>
  );
}
