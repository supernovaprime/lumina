import type { Metadata } from "next";

import { BusinessesManager } from "@/components/dashboard/BusinessesManager";
import type { VerificationStatus } from "@/lib/api";

export const metadata: Metadata = { title: "Businesses" };

function initialStatus(value?: string): VerificationStatus | "" {
  return value === "PENDING" || value === "APPROVED" || value === "REJECTED"
    ? value
    : "";
}

export default function AdminBusinessesPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const status = initialStatus(searchParams.status);

  return <BusinessesManager key={status} initialStatus={status} />;
}
