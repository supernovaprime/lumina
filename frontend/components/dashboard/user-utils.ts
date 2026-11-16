import type { UserRole } from "@/lib/api";

export type UserIdentity = {
  email: string;
  customer: {
    firstName: string;
    lastName: string;
  } | null;
  business: {
    name: string;
  } | null;
};

export const roleLabels: Record<UserRole, string> = {
  CUSTOMER: "Customer",
  BUSINESS: "Business",
  ADMIN: "Administrator",
};

export const roleDescriptions: Record<UserRole, string> = {
  CUSTOMER: "Books services from partner businesses",
  BUSINESS: "Operates a detailing business on Lumina",
  ADMIN: "Manages the platform and its partners",
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const relativeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});

const countFormatter = new Intl.NumberFormat("en-US");

export function formatUserDate(value: string | null | undefined): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return dateFormatter.format(date);
}

export function formatUserDateTime(value: string | null | undefined): string {
  if (!value) return "Never";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";

  return dateTimeFormatter.format(date);
}

export function formatUserRelativeTime(value: string | null | undefined): string {
  if (!value) return "Never signed in";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never signed in";

  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const ranges: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];

  for (const [unit, size] of ranges) {
    if (Math.abs(seconds) >= size || unit === "minute") {
      return relativeFormatter.format(Math.round(seconds / size), unit);
    }
  }

  return "Just now";
}

export function formatUserCount(value: number): string {
  return countFormatter.format(value);
}

export function formatUserCurrency(value: number | string): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function getUserName(user: UserIdentity): string {
  if (user.customer) {
    const name = `${user.customer.firstName} ${user.customer.lastName}`.trim();
    if (name) return name;
  }

  if (user.business?.name) return user.business.name;

  return user.email.split("@")[0] || "Lumina account";
}

export function getUserInitials(user: UserIdentity): string {
  const name = getUserName(user);
  const parts = name
    .split(/[\s._-]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length > 1) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
}

export function getUserRoleLabel(role: UserRole): string {
  return roleLabels[role];
}
