import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";

import { AdminFeaturePage } from "@/components/dashboard/AdminFeaturePage";

export const metadata: Metadata = { title: "Bookings" };

export default function AdminBookingsPage() {
  return (
    <AdminFeaturePage
      eyebrow="Platform"
      title="Booking oversight"
      description="Follow every wash across the platform, resolve disputes, and step in when a booking needs an administrator's override."
      icon={CalendarDays}
      phase="Scaffold · Phase 3"
      capabilities={[
        "Filter by date, status, business, customer, or created-at range",
        "Scan customer, business, service, vehicle, and payment context per row",
        "Open a booking for the full lifecycle timeline",
        "Cancel on behalf of a customer or partner with a required reason",
        "Refund completed payments as part of the cancellation flow",
      ]}
      method="GET"
      endpoint="/admin/bookings"
      params={["date", "status", "businessId", "customerId", "from", "to", "page", "limit"]}
      notes={[
        "Cancellation is DELETE /admin/bookings/:id with a mandatory reason body.",
        "Admin cancellation decrements slot usage and flips a COMPLETED payment to REFUNDED; no separate Stripe refund call is made.",
      ]}
    />
  );
}
