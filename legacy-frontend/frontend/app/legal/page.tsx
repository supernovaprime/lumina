import type { Metadata } from "next";
import { Navbar } from "@/components/landing/Navbar";
import { ComingSoon } from "@/components/landing/ComingSoon";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = { title: "Legal" };

export default function LegalPlaceholder() {
  return (
    <>
      <Navbar />
      <ComingSoon
        title="Terms & Privacy"
        copy="Our Terms & Conditions and Privacy Policy are being finalized and will live here."
      />
      <Footer />
    </>
  );
}
