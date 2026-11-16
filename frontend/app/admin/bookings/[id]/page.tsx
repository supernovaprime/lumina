import type { Metadata } from "next";

import { BookingProfile } from "@/components/dashboard/BookingProfile";

export const metadata: Metadata = { title: "Booking detail" };

export default function AdminBookingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <BookingProfile id={params.id} />;
}
