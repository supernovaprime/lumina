import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { ServicesGrid } from "@/components/landing/ServicesGrid";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Testimonials } from "@/components/landing/Testimonials";
import { AppBand } from "@/components/landing/AppBand";
import { Footer } from "@/components/layout/Footer";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <ServicesGrid />
        <HowItWorks />
        <Testimonials />
        <AppBand />
      </main>
      <Footer />
    </>
  );
}
