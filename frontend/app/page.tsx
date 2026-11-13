import { CtaBand } from "@/components/landing/CtaBand";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Services } from "@/components/landing/Services";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { Testimonials } from "@/components/landing/Testimonials";
import { WhyLumina } from "@/components/landing/WhyLumina";
import { SiteFooter } from "@/components/layout/SiteFooter";

export default function HomePage() {
  return (
    <main
      id="top"
      className="min-h-dvh bg-background px-2 pb-2 pt-2 sm:px-3 sm:pb-3 sm:pt-3 lg:px-4 lg:pb-4 lg:pt-4"
    >
      <SiteHeader />

      <div className="stage-surface relative mx-auto flex max-w-[var(--container-page)] flex-col overflow-hidden rounded-[2rem] sm:rounded-[2.5rem]">
        <div className="flex min-h-[calc(100dvh-5.25rem)] flex-col sm:min-h-[calc(100dvh-6.25rem)] lg:min-h-[calc(100dvh-7rem)]">
          <Hero />
        </div>

        <Services />
        <HowItWorks />
        <WhyLumina />
        <Testimonials />
        <CtaBand />
        <SiteFooter />
      </div>
    </main>
  );
}
