import type { Metadata } from "next";

import { UserProfile } from "@/components/dashboard/UserProfile";

export const metadata: Metadata = { title: "User profile" };

export default function AdminUserDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <UserProfile id={params.id} />;
}
