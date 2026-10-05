import type { Metadata } from "next";
import { Navbar } from "@/components/landing/Navbar";
import { ComingSoon } from "@/components/landing/ComingSoon";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = { title: "Help & Support" };

export default function SupportPlaceholder() {
  return (
    <>
      <Navbar />
      <ComingSoon
        title="Help & Support"
        copy="FAQs and support channels arrive with the customer hub in Phase 5. For now, reach us through the newsletter below."
      />
      <Footer />
    </>
  );
}
