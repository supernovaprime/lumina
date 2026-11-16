import type { Metadata } from "next";

import { BookingsManager } from "@/components/dashboard/BookingsManager";

export const metadata: Metadata = { title: "Bookings" };

export default function AdminBookingsPage() {
  return <BookingsManager />;
}
