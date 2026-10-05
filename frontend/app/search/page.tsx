import type { Metadata } from "next";
import { Navbar } from "@/components/landing/Navbar";
import { ComingSoon } from "@/components/landing/ComingSoon";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = { title: "Find a Car Wash" };

export default function SearchPlaceholder() {
  return (
    <>
      <Navbar />
      <ComingSoon
        title="Find a Car Wash"
        copy="Search, filters, and the live map arrive in Phase 3. Meanwhile, browse our service categories on the home page."
      />
      <Footer />
    </>
  );
}
