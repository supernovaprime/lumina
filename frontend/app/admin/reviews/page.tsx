import type { Metadata } from "next";
import { Star } from "lucide-react";

import { AdminFeaturePage } from "@/components/dashboard/AdminFeaturePage";

export const metadata: Metadata = { title: "Reviews" };

export default function AdminReviewsPage() {
  return (
    <AdminFeaturePage
      eyebrow="Trust"
      title="Reviews moderation"
      description="Keep partner ratings honest and customer feedback civil without deleting the record of what happened."
      icon={Star}
      phase="Scaffold · Phase 3"
      capabilities={[
        "Filter by hidden state, business, and rating range",
        "See customer, partner, rating, and comment in one row",
        "Hide a review with a mandatory reason",
        "Restore a previously hidden review",
        "Trigger rating recomputation for the affected business",
      ]}
      method="GET"
      endpoint="/admin/reviews"
      params={["isHidden", "businessId", "minRating", "maxRating", "page", "limit"]}
      notes={[
        "Hiding and unhiding recompute the partner's average rating and reviewCount from visible reviews only.",
        "Reviews are never deleted; isHidden and hiddenReason preserve the moderation trail.",
      ]}
    />
  );
}
