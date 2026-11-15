import type { Metadata } from "next";
import { Users } from "lucide-react";

import { AdminFeaturePage } from "@/components/dashboard/AdminFeaturePage";

export const metadata: Metadata = { title: "Users" };

export default function AdminUsersPage() {
  return (
    <AdminFeaturePage
      eyebrow="Platform"
      title="User management"
      description="Search every Lumina account, inspect customer and business context, and suspend or restore access without leaving the console."
      icon={Users}
      phase="Scaffold · Phase 2"
      capabilities={[
        "Search by email, first name, or last name",
        "Filter by role and sort by join date, email, or last login",
        "Open a user profile with vehicles, bookings, and account health",
        "Deactivate with a reason, revoking sessions and cancelling future bookings",
        "Reactivate a previously suspended account",
      ]}
      method="GET"
      endpoint="/admin/users"
      params={["role", "q", "page", "limit", "sortBy", "sortOrder"]}
      notes={[
        "Deactivation increments tokenVersion and deletes refresh tokens, so existing sessions are dropped.",
        "Activation and deactivation are the only account mutations exposed today — there is no hard delete or role-change endpoint.",
      ]}
    />
  );
}
