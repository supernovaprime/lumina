import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";

import { AdminFeaturePage } from "@/components/dashboard/AdminFeaturePage";

export const metadata: Metadata = { title: "Reports" };

export default function AdminReportsPage() {
  return (
    <AdminFeaturePage
      eyebrow="Insights"
      title="Report exports"
      description="Generate CSV snapshots of platform activity for finance, partner reviews, or board updates."
      icon={BarChart3}
      phase="Scaffold · Phase 4"
      capabilities={[
        "Choose bookings, revenue, businesses, or users as the report type",
        "Pick a date range of up to 90 days",
        "Optionally scope a report to a single business",
        "Generate the file and copy a time-limited download link",
        "Check the status of an earlier report job by id",
      ]}
      method="GET"
      endpoint="/admin/reports"
      params={["from", "to", "type", "businessId"]}
      notes={[
        "Report generation is synchronous: the request returns a job with a presigned download URL when complete.",
        "Download links expire after roughly one hour; the backend has no report-history list endpoint.",
      ]}
    />
  );
}
