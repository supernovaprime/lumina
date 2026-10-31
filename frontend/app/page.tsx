import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { HeroBackdrop } from "@/components/landing/HeroBackdrop";
import { TrustBand } from "@/components/landing/TrustBand";
import { ServicesGrid } from "@/components/landing/ServicesGrid";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { WhyLumina } from "@/components/landing/WhyLumina";
import { Testimonials } from "@/components/landing/Testimonials";
import { AppBand } from "@/components/landing/AppBand";
import { Footer } from "@/components/layout/Footer";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main className="relative isolate overflow-hidden bg-[#f7f5ec] dark:bg-[#071a20]">
        {/* Decorative gradient background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div
            className="absolute inset-0 dark:hidden"
            style={{
              backgroundImage:
                "radial-gradient(75% 80% at 100% 0%, rgba(10,147,150,0.14), transparent 60%), radial-gradient(80% 80% at 0% 100%, rgba(238,155,0,0.12), transparent 62%), linear-gradient(125deg, #f6f5ec 0%, #eef4ef 48%, #f4f1e7 100%)",
            }}
          />
          <div className="absolute -left-32 top-16 size-[32rem] rounded-full bg-teal-300/20 blur-3xl dark:bg-teal-500/10" />
          <div className="absolute -right-24 bottom-0 size-[26rem] rounded-full bg-gold-300/16 blur-3xl dark:bg-gold-500/[0.08]" />
          <div className="absolute inset-0 bg-white/15 dark:hidden" />

          {/* Pill badge with pulsing dot */}
          <div className="absolute top-24 right-1/2 translate-x-1/2 inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/10 px-4 py-1.5 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-400 animate-pulse" />
            <p className="text-label font-semibold uppercase tracking-[0.1em] text-gold-600 dark:text-gold-300">
              Ready when you are
            </p>
          </div>
        </div>

        <HeroBackdrop>
          <Hero />
          <TrustBand />
        </HeroBackdrop>
        <ServicesGrid />
        <HowItWorks />
        <WhyLumina />
        <Testimonials />
        <AppBand />
      </main>
      <Footer />
    </>
  );
}
