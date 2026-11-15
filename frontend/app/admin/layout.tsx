import type { Metadata } from "next";

import { AdminShell } from "@/components/dashboard/AdminShell";

export const metadata: Metadata = {
  title: {
    default: "Admin console",
    template: "%s · Admin console · Lumina",
  },
  description:
    "The Lumina platform console for verifying partners, moderating reviews, overseeing bookings, and exporting reports.",
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AdminShell>{children}</AdminShell>;
}
