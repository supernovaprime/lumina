import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";

import { AdminFeaturePage } from "@/components/dashboard/AdminFeaturePage";

export const metadata: Metadata = { title: "Booking detail" };

export default function AdminBookingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <AdminFeaturePage
      eyebrow="Platform · Booking"
      title="Booking record"
      description="The complete booking story: who booked, which partner and service, the vehicle, payment state, and any attached review."
      icon={ClipboardList}
      phase="Scaffold · Phase 3"
      detailId={params.id}
      backHref="/admin/bookings"
      backLabel="Back to bookings"
      capabilities={[
        "Customer and partner contact details side by side",
        "Service, vehicle, date, and time-slot summary",
        "Payment status and amount with refund context",
        "Attached review, including hidden state",
        "Administrator cancellation with a reason and refund",
      ]}
      method="GET"
      endpoint="/admin/bookings/:id"
      notes={[
        "Cancellation is destructive in this console: DELETE /admin/bookings/:id.",
        "The backend returns the raw payment and review records for this booking, ready for a lifecycle timeline.",
      ]}
    />
  );
}
