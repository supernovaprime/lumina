import type { AdminBookingSummary, BookingStatus } from "@/lib/api";

export function getCustomerName(
  customer: Pick<AdminBookingSummary["customer"], "firstName" | "lastName">
): string {
  const name = `${customer.firstName} ${customer.lastName}`.trim();
  return name || "Lumina customer";
}

export function getCustomerInitials(
  customer: Pick<AdminBookingSummary["customer"], "firstName" | "lastName">
): string {
  const parts = [customer.firstName, customer.lastName]
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length > 1) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  return (parts[0] ?? "LC").slice(0, 2).toUpperCase();
}

export function getVehicleLabel(
  vehicle: Pick<AdminBookingSummary["vehicle"], "make" | "model">
): string {
  return `${vehicle.make} ${vehicle.model}`.trim() || "Vehicle";
}

export function getBookingShortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

export function isCancellableStatus(status: BookingStatus): boolean {
  return status !== "CANCELLED" && status !== "REFUNDED";
}

export function startOfDayIso(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function endOfDayIso(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
