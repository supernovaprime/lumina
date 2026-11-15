import type { Metadata } from "next";
import { UserRound } from "lucide-react";

import { AdminFeaturePage } from "@/components/dashboard/AdminFeaturePage";

export const metadata: Metadata = { title: "User profile" };

export default function AdminUserDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <AdminFeaturePage
      eyebrow="Platform · User"
      title="Account profile"
      description="A single account view combining identity, role, activity, and the safety controls an administrator needs."
      icon={UserRound}
      phase="Scaffold · Phase 2"
      detailId={params.id}
      backHref="/admin/users"
      backLabel="Back to users"
      capabilities={[
        "Identity card with email, role, verification, and last login",
        "Customer context: vehicles, recent bookings, reviews, and favourites",
        "Business context: services, booking volume, and review count",
        "Activate or deactivate the account with an audited reason",
      ]}
      method="GET"
      endpoint="/admin/users/:id"
      notes={[
        "Mutations live at PUT /admin/users/:id/activate and PUT /admin/users/:id/deactivate.",
        "Deactivation cancels upcoming PENDING and CONFIRMED bookings for customer accounts and deactivates owned businesses.",
      ]}
    />
  );
}
