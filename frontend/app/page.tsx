import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { StatsBand } from "@/components/landing/StatsBand";
import { ServicesGrid } from "@/components/landing/ServicesGrid";
import { WhyLumina } from "@/components/landing/WhyLumina";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Testimonials } from "@/components/landing/Testimonials";
import { AppBand } from "@/components/landing/AppBand";
import { GridBackdrop } from "@/components/landing/GridBackdrop";
import { Footer } from "@/components/layout/Footer";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main className="relative isolate">
        <GridBackdrop className="-z-10" />
        <Hero />
        <StatsBand />
        <ServicesGrid />
        <WhyLumina />
        <HowItWorks />
        <Testimonials />
        <AppBand />
      </main>
      <Footer />
    </>
  );
}
