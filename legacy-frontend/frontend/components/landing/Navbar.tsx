import Link from "next/link";
import { ArrowRight, Menu } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function Navbar() {
  return (
    <>
      <header className="sticky top-0 z-50 px-3 pt-3 sm:px-5 lg:px-6">
        <nav
          aria-label="Primary"
          className="mx-auto flex h-18 max-w-[1440px] items-center gap-3 rounded-full border border-white/60 bg-gradient-to-r from-white/65 via-white/45 to-white/60 px-3 shadow-[0_16px_48px_-24px_rgba(0,18,25,0.35)] backdrop-blur-2xl dark:border-white/10 dark:from-white/[0.08] dark:via-white/[0.04] dark:to-white/[0.07] dark:shadow-[0_16px_48px_-24px_rgba(0,0,0,0.85)] sm:gap-5 sm:px-5"
        >
          <Link
            href="/"
            aria-label="Lumina home"
            className="flex items-center rounded-full py-1 pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/50 dark:focus-visible:ring-teal-300/50"
          >
            <BrandMark tagline={false} />
          </Link>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <Link
              href="/login"
              className="hidden rounded-full px-3.5 py-2 text-sm font-medium text-[#586c70] transition-colors hover:bg-white/50 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/50 dark:text-[#a9bfc4] dark:hover:bg-white/[0.06] dark:hover:text-teal-200 dark:focus-visible:ring-teal-300/50 md:inline-flex"
            >
              Log in
            </Link>
            <Button
              asChild
              size="sm"
              className="hidden rounded-full bg-teal-600 px-4 shadow-[0_10px_24px_-14px_rgba(10,147,150,0.8)] hover:bg-navy-800 dark:bg-teal-400 dark:text-navy-950 dark:shadow-[0_10px_24px_-14px_rgba(61,180,186,0.6)] dark:hover:bg-teal-300 sm:inline-flex"
            >
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
                  className="rounded-full border-white/60 bg-white/40 text-navy-800 backdrop-blur-xl hover:bg-white/70 hover:text-teal-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-teal-200 dark:hover:bg-white/10 dark:hover:text-teal-100 lg:hidden"
                  aria-label="Open menu"
                >
                  <Menu aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent className="border-white/60 bg-[#fafaf6]/95 backdrop-blur-2xl dark:border-white/10 dark:bg-[#06171d]/95">
                <SheetTitle className="sr-only">Lumina menu</SheetTitle>
                <SheetDescription className="sr-only">
                  Find a wash or log in to your account.
                </SheetDescription>
                <div className="mt-12">
                  <BrandMark />
                </div>

                <div className="mt-auto grid gap-2 pt-8">
                  <SheetClose asChild>
                    <Link
                      href="/search"
                      className={buttonVariants({
                        size: "lg",
                        className:
                          "rounded-full bg-teal-600 hover:bg-navy-800 dark:bg-teal-400 dark:text-navy-950 dark:hover:bg-teal-300",
                      })}
                    >
                      Find a wash
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link
                      href="/login"
                      className={buttonVariants({
                        variant: "outline",
                        size: "lg",
                        className:
                          "rounded-full border-white/60 bg-white/40 dark:border-white/10 dark:bg-white/[0.06]",
                      })}
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
