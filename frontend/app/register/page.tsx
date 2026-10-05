import type { Metadata } from "next";
import { Navbar } from "@/components/landing/Navbar";
import { ComingSoon } from "@/components/landing/ComingSoon";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = { title: "Sign Up" };

export default function RegisterPlaceholder() {
  return (
    <>
      <Navbar />
      <ComingSoon
        title="Create your account"
        copy="Registration for customers and businesses opens in Phase 2."
      />
      <Footer />
    </>
  );
}
