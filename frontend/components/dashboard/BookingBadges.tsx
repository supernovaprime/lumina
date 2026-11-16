import {
  CheckCircle2,
  Clock3,
  Loader2,
  RotateCcw,
  XCircle,
} from "lucide-react";

import { humanizeBusinessValue } from "@/components/dashboard/business-utils";
import type { BookingStatus, PaymentStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

const bookingTone: Record<BookingStatus, string> = {
  PENDING:
    "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-200",
  CONFIRMED:
    "border-sea-500/25 bg-sea-500/10 text-sea-700 dark:border-sea-300/25 dark:bg-sea-400/10 dark:text-sea-200",
  IN_PROGRESS:
    "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:border-sky-300/25 dark:bg-sky-400/10 dark:text-sky-200",
  COMPLETED:
    "border-green-700/25 bg-green-700/10 text-success dark:border-green-300/20 dark:bg-green-300/10",
  CANCELLED:
    "border-red-500/25 bg-red-500/10 text-red-700 dark:border-red-300/25 dark:bg-red-400/10 dark:text-red-200",
  REFUNDED:
    "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:border-violet-300/25 dark:bg-violet-400/10 dark:text-violet-200",
};

const paymentTone: Record<PaymentStatus, string> = {
  PENDING:
    "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-200",
  PROCESSING:
    "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:border-sky-300/25 dark:bg-sky-400/10 dark:text-sky-200",
  COMPLETED:
    "border-green-700/25 bg-green-700/10 text-success dark:border-green-300/20 dark:bg-green-300/10",
  FAILED:
    "border-red-500/25 bg-red-500/10 text-red-700 dark:border-red-300/25 dark:bg-red-400/10 dark:text-red-200",
  REFUNDED:
    "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:border-violet-300/25 dark:bg-violet-400/10 dark:text-violet-200",
  PARTIAL_REFUNDED:
    "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:border-violet-300/25 dark:bg-violet-400/10 dark:text-violet-200",
};

function StatusIcon({
  status,
}: {
  status: BookingStatus | PaymentStatus;
}) {
  if (status === "COMPLETED") {
    return <CheckCircle2 aria-hidden="true" className="size-3" />;
  }

  if (status === "CANCELLED" || status === "FAILED") {
    return <XCircle aria-hidden="true" className="size-3" />;
  }

  if (
    status === "REFUNDED" ||
    status === "PARTIAL_REFUNDED"
  ) {
    return <RotateCcw aria-hidden="true" className="size-3" />;
  }

  if (status === "PROCESSING" || status === "IN_PROGRESS") {
    return <Loader2 aria-hidden="true" className="size-3 animate-spin" />;
  }

  return <Clock3 aria-hidden="true" className="size-3" />;
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.65rem] font-medium",
        bookingTone[status]
      )}
    >
      <StatusIcon status={status} />
      {humanizeBusinessValue(status)}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.65rem] font-medium",
        paymentTone[status]
      )}
    >
      <StatusIcon status={status} />
      {humanizeBusinessValue(status)}
    </span>
  );
}
