import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Inbox,
  Sparkles,
  Users,
  Package,
  UserPlus,
  GraduationCap,
  Target,
  Headset,
  MessageCircle,
  Wallet,
  Receipt,
  Clock,
  FolderKanban,
  Files,
  CalendarDays,
  BarChart3,
  ScrollText,
  Home,
  UserRound,
  FolderOpen,
  Send,
  Banknote,
  HandCoins,
  Briefcase,
  Gauge,
} from "lucide-react";
import type { UserRole } from "@prisma/client";

export type NavGroupId = "operate" | "people" | "work" | "pay" | "insight" | "me";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
  group: NavGroupId;
};

export const NAV_GROUP_LABELS: Record<NavGroupId, string> = {
  operate: "Operate",
  people: "People",
  work: "Work",
  pay: "Pay",
  insight: "Insight",
  me: "Me",
};

export const NAV_GROUP_ICONS: Record<NavGroupId, LucideIcon> = {
  operate: Gauge,
  people: Users,
  work: Briefcase,
  pay: Wallet,
  insight: BarChart3,
  me: UserRound,
};

export const NAV_GROUP_ORDER: NavGroupId[] = [
  "operate",
  "people",
  "work",
  "pay",
  "insight",
];

export const STAFF_GROUP_ORDER: NavGroupId[] = ["me", "work"];

export const adminNavItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: LayoutDashboard,
    roles: ["SUPER_ADMIN", "HR_ADMIN", "BUSINESS_HEAD"],
    group: "operate",
  },
  {
    href: "/approvals",
    label: "Approvals",
    icon: Inbox,
    roles: ["SUPER_ADMIN", "HR_ADMIN", "BUSINESS_HEAD"],
    group: "operate",
  },
  {
    href: "/copilot",
    label: "Co-Pilot",
    icon: Sparkles,
    roles: ["SUPER_ADMIN", "HR_ADMIN", "BUSINESS_HEAD"],
    group: "operate",
  },
  {
    href: "/employees",
    label: "Employees",
    icon: Users,
    roles: ["SUPER_ADMIN", "HR_ADMIN", "BUSINESS_HEAD"],
    group: "people",
  },
  {
    href: "/assets",
    label: "Assets",
    icon: Package,
    roles: ["SUPER_ADMIN", "HR_ADMIN", "BUSINESS_HEAD"],
    group: "people",
  },
  {
    href: "/recruitment",
    label: "Recruitment",
    icon: UserPlus,
    roles: ["SUPER_ADMIN", "HR_ADMIN"],
    group: "people",
  },
  {
    href: "/training",
    label: "Training",
    icon: GraduationCap,
    roles: ["SUPER_ADMIN", "HR_ADMIN", "BUSINESS_HEAD"],
    group: "people",
  },
  {
    href: "/performance",
    label: "Performance",
    icon: Target,
    roles: ["SUPER_ADMIN", "HR_ADMIN", "BUSINESS_HEAD"],
    group: "people",
  },
  {
    href: "/hr-desk",
    label: "HR Desk",
    icon: Headset,
    roles: ["SUPER_ADMIN", "HR_ADMIN"],
    group: "people",
  },
  {
    href: "/hr-ask",
    label: "HR Ask",
    icon: MessageCircle,
    roles: ["SUPER_ADMIN", "HR_ADMIN"],
    group: "people",
  },
  {
    href: "/payroll",
    label: "Payroll",
    icon: Wallet,
    roles: ["SUPER_ADMIN", "HR_ADMIN"],
    group: "pay",
  },
  {
    href: "/expenses",
    label: "Expenses",
    icon: Receipt,
    roles: ["SUPER_ADMIN", "HR_ADMIN"],
    group: "pay",
  },
  {
    href: "/timesheets",
    label: "Timesheets",
    icon: Clock,
    roles: ["SUPER_ADMIN", "HR_ADMIN", "BUSINESS_HEAD"],
    group: "work",
  },
  {
    href: "/projects",
    label: "Projects",
    icon: FolderKanban,
    roles: ["SUPER_ADMIN", "HR_ADMIN", "BUSINESS_HEAD"],
    group: "work",
  },
  {
    href: "/files",
    label: "Files",
    icon: Files,
    roles: ["SUPER_ADMIN", "HR_ADMIN", "BUSINESS_HEAD"],
    group: "work",
  },
  {
    href: "/leave",
    label: "Leave",
    icon: CalendarDays,
    roles: ["SUPER_ADMIN", "HR_ADMIN"],
    group: "work",
  },
  {
    href: "/reports",
    label: "Reports",
    icon: BarChart3,
    roles: ["SUPER_ADMIN", "HR_ADMIN", "BUSINESS_HEAD"],
    group: "insight",
  },
  {
    href: "/audit-log",
    label: "Audit log",
    icon: ScrollText,
    roles: ["SUPER_ADMIN", "HR_ADMIN"],
    group: "insight",
  },
];

export const staffNavItems: NavItem[] = [
  { href: "/staff", label: "Home", icon: Home, roles: ["EMPLOYEE"], group: "me" },
  {
    href: "/staff/profile",
    label: "My details",
    icon: UserRound,
    roles: ["EMPLOYEE"],
    group: "me",
  },
  {
    href: "/staff/payslips",
    label: "Payslips",
    icon: Banknote,
    roles: ["EMPLOYEE"],
    group: "me",
  },
  {
    href: "/staff/advances",
    label: "Advances",
    icon: HandCoins,
    roles: ["EMPLOYEE"],
    group: "me",
  },
  {
    href: "/staff/expenses",
    label: "Expenses",
    icon: Receipt,
    roles: ["EMPLOYEE"],
    group: "me",
  },
  {
    href: "/staff/requests",
    label: "Requests",
    icon: Send,
    roles: ["EMPLOYEE"],
    group: "me",
  },
  {
    href: "/staff/files",
    label: "Files",
    icon: FolderOpen,
    roles: ["EMPLOYEE"],
    group: "me",
  },
  {
    href: "/staff/performance",
    label: "Performance",
    icon: Target,
    roles: ["EMPLOYEE"],
    group: "me",
  },
  {
    href: "/staff/leave",
    label: "Leave",
    icon: CalendarDays,
    roles: ["EMPLOYEE"],
    group: "work",
  },
  {
    href: "/staff/timesheets",
    label: "Timesheets",
    icon: Clock,
    roles: ["EMPLOYEE"],
    group: "work",
  },
  {
    href: "/staff/projects",
    label: "Projects",
    icon: FolderKanban,
    roles: ["EMPLOYEE"],
    group: "work",
  },
];

export const financeNavItems: NavItem[] = [
  {
    href: "/finance",
    label: "Payroll to process",
    icon: Wallet,
    roles: ["FINANCE"],
    group: "pay",
  },
  {
    href: "/finance/expenses",
    label: "Expenses",
    icon: Receipt,
    roles: ["FINANCE"],
    group: "pay",
  },
];

export function portalEyebrow(portal: string | null) {
  switch (portal) {
    case "SUPER_ADMIN":
      return "Super Admin";
    case "HR_ADMIN":
      return "HR";
    case "FINANCE":
      return "Finance";
    case "BUSINESS_HEAD":
      return "Business head";
    case "EMPLOYEE":
      return "Staff";
    default:
      return "Workspace";
  }
}

export function portalPurpose(portal: string | null) {
  switch (portal) {
    case "SUPER_ADMIN":
      return "Clear payroll & sensitive updates";
    case "HR_ADMIN":
      return "People ops — seek clearance when needed";
    case "FINANCE":
      return "Process approved payroll for this company";
    case "BUSINESS_HEAD":
      return "This company’s people, projects, and files";
    case "EMPLOYEE":
      return "Your details, leave, timesheets, and requests";
    default:
      return "";
  }
}

export function isNavActive(pathname: string, href: string) {
  if (href === "/staff") return pathname === "/staff";
  if (href === "/finance") return pathname === "/finance";
  return pathname === href || pathname.startsWith(`${href}/`);
}
