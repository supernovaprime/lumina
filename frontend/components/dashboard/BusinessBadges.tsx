import { CheckCircle2, Clock3, XCircle } from "lucide-react";

import { getBusinessInitials } from "@/components/dashboard/business-utils";
import type { AdminBusinessSummary, VerificationStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

const verificationTone: Record<VerificationStatus, string> = {
  PENDING:
    "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-200",
  APPROVED:
    "border-green-700/25 bg-green-700/10 text-success dark:border-green-300/20 dark:bg-green-300/10",
  REJECTED:
    "border-red-500/25 bg-red-500/10 text-red-700 dark:border-red-300/25 dark:bg-red-400/10 dark:text-red-200",
};

const verificationLabel: Record<VerificationStatus, string> = {
  PENDING: "Pending review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const verificationIcon = {
  PENDING: Clock3,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
};

export function VerificationBadge({
  status,
}: {
  status: VerificationStatus;
}) {
  const Icon = verificationIcon[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.65rem] font-medium",
        verificationTone[status]
      )}
    >
      <Icon aria-hidden="true" className="size-3" />
      {verificationLabel[status]}
    </span>
  );
}

export function BusinessActiveBadge({ isActive }: { isActive: boolean }) {
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
      {isActive ? "Live" : "Offline"}
    </span>
  );
}

export function BusinessAvatar({
  business,
  size = "md",
}: {
  business: Pick<AdminBusinessSummary, "name" | "logo">;
  size?: "md" | "lg";
}) {
  const logo =
    business.logo && /^(https?:\/\/|\/)/i.test(business.logo)
      ? business.logo.replace(/["\\\n\r]/g, "")
      : null;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/50 bg-gradient-to-br from-amber-300/30 via-sea-400/15 to-transparent font-display font-semibold text-amber-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-white/10 dark:from-amber-300/20 dark:via-sea-400/10 dark:text-amber-100",
        size === "lg" ? "size-16 text-xl" : "size-10 text-caption"
      )}
    >
      <span className="absolute inset-0 grid place-items-center">
        {getBusinessInitials(business.name)}
      </span>
      {logo && (
        <span
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url("${logo}")` }}
        />
      )}
    </span>
  );
}
