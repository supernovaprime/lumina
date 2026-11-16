import type { Metadata } from "next";
import { Building2 } from "lucide-react";

import { AdminFeaturePage } from "@/components/dashboard/AdminFeaturePage";

export const metadata: Metadata = { title: "Business profile" };

export default function AdminBusinessDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <AdminFeaturePage
      eyebrow="Platform · Business"
      title="Partner profile"
      description="Everything an administrator needs to verify a partner: identity, location, services, performance, and lifetime revenue."
      icon={Building2}
      phase="Scaffold · Phase 2"
      detailId={params.id}
      backHref="/admin/businesses"
      backLabel="Back to businesses"
      capabilities={[
        "Profile header with verification state, rating, and contact details",
        "Owner account link and business location summary",
        "Service catalogue with pricing and duration",
        "Booking and review counts plus completed revenue",
        "Approve, reject, or deactivate with an audited reason",
      ]}
      method="GET"
      endpoint="/admin/businesses/:id"
      notes={[
        "Verification is a PUT to /admin/businesses/:id/verify with action APPROVE or REJECT.",
        "Deactivation is a PUT to /admin/businesses/:id/deactivate; there is no reactivation endpoint yet.",
      ]}
    />
  );
}
