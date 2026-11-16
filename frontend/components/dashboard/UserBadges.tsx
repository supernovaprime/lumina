import {
  getUserInitials,
  getUserRoleLabel,
} from "@/components/dashboard/user-utils";
import type { AdminUserSummary, UserRole } from "@/lib/api";
import { cn } from "@/lib/utils";

const roleTone: Record<UserRole, string> = {
  CUSTOMER:
    "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:border-sky-300/25 dark:bg-sky-400/10 dark:text-sky-200",
  BUSINESS:
    "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-200",
  ADMIN:
    "border-sea-500/25 bg-sea-500/10 text-sea-700 dark:border-sea-300/25 dark:bg-sea-400/10 dark:text-sea-200",
};

const avatarTone: Record<UserRole, string> = {
  CUSTOMER:
    "from-sky-500/25 via-sea-400/15 to-transparent text-sky-800 dark:from-sky-400/25 dark:via-sea-400/10 dark:text-sky-100",
  BUSINESS:
    "from-amber-400/30 via-amber-300/10 to-transparent text-amber-800 dark:from-amber-300/25 dark:via-amber-300/10 dark:text-amber-100",
  ADMIN:
    "from-sea-500/30 via-sky-400/15 to-transparent text-sea-800 dark:from-sea-300/30 dark:via-sky-400/10 dark:text-sea-100",
};

export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-medium",
        roleTone[role]
      )}
    >
      {getUserRoleLabel(role)}
    </span>
  );
}

export function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.65rem] font-medium",
        isActive
          ? "border-green-700/25 bg-green-700/10 text-success dark:border-green-300/20 dark:bg-green-300/10"
          : "border-red-500/25 bg-red-500/10 text-red-700 dark:border-red-300/25 dark:bg-red-400/10 dark:text-red-200"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full",
          isActive
            ? "bg-green-700 dark:bg-green-300"
            : "bg-red-600 dark:bg-red-300"
        )}
      />
      {isActive ? "Active" : "Suspended"}
    </span>
  );
}

export function AccountAvatar({
  user,
  size = "md",
}: {
  user: AdminUserSummary;
  size?: "md" | "lg";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-2xl border border-white/50 bg-gradient-to-br font-display font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-white/10",
        avatarTone[user.role],
        size === "lg" ? "size-16 text-xl" : "size-10 text-caption"
      )}
    >
      {getUserInitials(user)}
    </span>
  );
}
