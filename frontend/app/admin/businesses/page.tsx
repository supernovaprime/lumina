import type { Metadata } from "next";
import { Store } from "lucide-react";

import { AdminFeaturePage } from "@/components/dashboard/AdminFeaturePage";

export const metadata: Metadata = { title: "Businesses" };

export default function AdminBusinessesPage() {
  return (
    <AdminFeaturePage
      eyebrow="Platform"
      title="Business management"
      description="Review partner applications, keep the marketplace trustworthy, and take a business offline when standards slip."
      icon={Store}
      phase="Scaffold · Phase 2"
      capabilities={[
        "Verification queue filtered to PENDING applications",
        "Search by business name, city, or owner email",
        "Filter by verification status and active state",
        "Approve or reject with a reason that is emailed to the partner",
        "Deactivate a live business and invalidate search caches",
      ]}
      method="GET"
      endpoint="/admin/businesses"
      params={["status", "isActive", "q", "page", "limit"]}
      notes={[
        "Approval sets isVerified, stamps verifiedAt and verifiedBy, emails the partner, and clears search caches.",
        "Rejection stores rejectionReason and notifies the partner; the application can be re-reviewed later.",
      ]}
    />
  );
}
