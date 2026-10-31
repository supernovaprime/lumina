import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
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
      <main>
        <Hero />
        <TrustBand />
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
