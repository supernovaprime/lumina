import type { Metadata } from "next";
import { Navbar } from "@/components/landing/Navbar";
import { ComingSoon } from "@/components/landing/ComingSoon";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = { title: "Log In" };

export default function LoginPlaceholder() {
  return (
    <>
      <Navbar />
      <ComingSoon
        title="Log In"
        copy="Customer, business, and admin sign-in arrives in Phase 2 with secure JWT sessions."
      />
      <Footer />
    </>
  );
}
