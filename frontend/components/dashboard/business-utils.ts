import type { AdminBusinessSummary } from "@/lib/api";

type BusinessLocation = Pick<
  AdminBusinessSummary,
  "address" | "city" | "state" | "zipCode"
>;

const ratingFormatter = new Intl.NumberFormat("en-GH", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function getBusinessInitials(name: string): string {
  const parts = name
    .split(/[\s&._-]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length > 1) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  return (parts[0] ?? "Lumina").slice(0, 2).toUpperCase();
}

export function getBusinessLocation(business: BusinessLocation): string {
  return [business.city, business.state].filter(Boolean).join(", ");
}

export function getBusinessFullAddress(business: BusinessLocation): string {
  return [
    business.address,
    business.city,
    business.state,
    business.zipCode,
  ]
    .filter(Boolean)
    .join(", ");
}

export function formatBusinessRating(rating: number): string {
  return ratingFormatter.format(Number.isFinite(rating) ? rating : 0);
}

export function humanizeBusinessValue(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
