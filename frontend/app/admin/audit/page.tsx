import type { Metadata } from "next";
import { ScrollText } from "lucide-react";

import { AdminFeaturePage } from "@/components/dashboard/AdminFeaturePage";

export const metadata: Metadata = { title: "Audit trail" };

export default function AdminAuditPage() {
  return (
    <AdminFeaturePage
      eyebrow="Insights"
      title="Audit trail"
      description="A read-only ledger of administrator actions across users, businesses, bookings, and reviews."
      icon={ScrollText}
      phase="Scaffold · Phase 4"
      capabilities={[
        "Filter by entity type, action, actor, or date range",
        "Paginate through newest-first audit entries",
        "Inspect the action metadata recorded with each change",
        "Cross-reference a booking, business, or review by entity id",
      ]}
      method="GET"
      endpoint="/admin/audit"
      params={["entity", "action", "actorId", "from", "to", "page", "limit"]}
      notes={[
        "Audit entries are written by the admin services for verification, deactivation, cancellation, and review moderation.",
        "There is no export or retention control endpoint; treat this view as read-only oversight.",
      ]}
    />
  );
}
