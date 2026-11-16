import type { Metadata } from "next";

import { BusinessProfile } from "@/components/dashboard/BusinessProfile";

export const metadata: Metadata = { title: "Business profile" };

export default function AdminBusinessDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <BusinessProfile key={params.id} id={params.id} />;
}
