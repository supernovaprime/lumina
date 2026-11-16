import type { Metadata } from "next";

import { UsersManager } from "@/components/dashboard/UsersManager";

export const metadata: Metadata = { title: "Users" };

export default function AdminUsersPage() {
  return <UsersManager />;
}
