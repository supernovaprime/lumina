import {
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  ScrollText,
  Star,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export type AdminNavSection = {
  label: string;
  items: AdminNavItem[];
};

export const adminNavSections: AdminNavSection[] = [
  {
    label: "Overview",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        description: "Platform pulse and quick actions",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Platform",
    items: [
      {
        href: "/admin/users",
        label: "Users",
        description: "Accounts, roles, and access",
        icon: Users,
      },
      {
        href: "/admin/businesses",
        label: "Businesses",
        description: "Verification and status",
        icon: Store,
      },
      {
        href: "/admin/bookings",
        label: "Bookings",
        description: "Oversight and cancellations",
        icon: CalendarDays,
      },
    ],
  },
  {
    label: "Trust",
    items: [
      {
        href: "/admin/reviews",
        label: "Reviews",
        description: "Moderation and hidden content",
        icon: Star,
      },
    ],
  },
  {
    label: "Insights",
    items: [
      {
        href: "/admin/reports",
        label: "Reports",
        description: "CSV exports by date range",
        icon: BarChart3,
      },
      {
        href: "/admin/audit",
        label: "Audit trail",
        description: "Every admin action, logged",
        icon: ScrollText,
      },
    ],
  },
];

export const adminToolkit = adminNavSections
  .flatMap((section) => section.items)
  .filter((item) => item.href !== "/admin");
