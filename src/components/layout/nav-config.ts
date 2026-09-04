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
  Settings,
} from "lucide-react";
import type { UserRole } from "@prisma/client";
import { can, effectivePortalRole } from "@/lib/permissions";

export type NavGroupId =
  | "operate"
  | "people"
  | "work"
  | "pay"
  | "insight"
  | "me"
  | "system";

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
  system: "System",
};

export const NAV_GROUP_ICONS: Record<NavGroupId, LucideIcon> = {
  operate: Gauge,
  people: Users,
  work: Briefcase,
  pay: Wallet,
  insight: BarChart3,
  me: UserRound,
  system: Settings,
};

/** Land / sea / sky / signal mapped onto rail groups. */
export const NAV_GROUP_TONE: Record<
  NavGroupId,
  "lagoon" | "ok" | "sky" | "signal" | "foam"
> = {
  operate: "lagoon",
  people: "ok",
  work: "signal",
  pay: "sky",
  insight: "sky",
  me: "lagoon",
  system: "foam",
};

export const NAV_GROUP_DOT: Record<NavGroupId, string> = {
  operate: "bg-lagoon",
  people: "bg-ok",
  work: "bg-signal",
  pay: "bg-sky",
  insight: "bg-sky",
  me: "bg-lagoon",
  system: "bg-white/40",
};

export const NAV_GROUP_ORDER: NavGroupId[] = [
  "operate",
  "people",
  "work",
  "pay",
  "insight",
  "system",
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
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    roles: ["SUPER_ADMIN", "HR_ADMIN"],
    group: "system",
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

export function portalChipClass(portal: string | null) {
  switch (portal) {
    case "SUPER_ADMIN":
      return "bg-lagoon text-ink";
    case "HR_ADMIN":
      return "bg-ok text-foam";
    case "FINANCE":
      return "bg-sky text-ink";
    case "BUSINESS_HEAD":
      return "bg-signal text-foam";
    case "EMPLOYEE":
      return "bg-sand text-ink ring-1 ring-line";
    default:
      return "bg-lagoon text-ink";
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

export const NAV_BLURBS: Record<string, string> = {
  "/dashboard": "Actions, payroll run-rate, and compliance",
  "/approvals": "One queue for work waiting on this seat",
  "/copilot": "Ask Omni Co-Pilot over live company records",
  "/employees": "Staff directory, departments, skills, and org chart",
  "/assets": "Laptops, vehicles, and other items assigned to staff",
  "/recruitment": "Listings, applications, and hire into staff records",
  "/training": "Programmes and enrolment",
  "/performance": "Goals, reviews, and recognition — not pay",
  "/hr-desk": "Company inbox, triage, and Gmail drafts",
  "/hr-ask": "Policy queries and change requests",
  "/payroll": "Draft, clear, and forward the pay run",
  "/expenses": "Expense reports for HR and Super Admin",
  "/timesheets": "Weekly hours, clock compile, and shift exceptions",
  "/projects": "Work catalog and assigned tasks",
  "/files": "Company library for this employer",
  "/leave": "Record and approve staff leave",
  "/reports": "Payroll, people, time, and cost snapshots",
  "/audit-log": "Immutable record of payroll and HR actions",
  "/settings": "Branding, team, rates, and workspace sync",
  "/staff": "Your portal home",
  "/staff/profile": "Personal details HR still needs",
  "/staff/payslips": "Approved slips after Super Admin signs off",
  "/staff/advances": "Request an advance repaid on the slip",
  "/staff/expenses": "Submit a claim with a receipt",
  "/staff/requests": "Letters, bank, tax, and other company help",
  "/staff/files": "Documents shared with full-time staff",
  "/staff/performance": "Your goals, self-assessment, and recognition",
  "/staff/leave": "Apply for leave",
  "/staff/timesheets": "Log weekly hours on a project and task",
  "/staff/projects": "Work you can log hours against",
  "/finance": "Payroll forwarded for this company",
  "/finance/expenses": "Pay claims after they are cleared",
};

export type NavSection = {
  group: NavGroupId;
  label: string;
  items: NavItem[];
};

export function visibleNavItems(role: UserRole | undefined | null): NavItem[] {
  if (!role) return [];
  const portal = effectivePortalRole(role);
  const items =
    portal === "EMPLOYEE"
      ? staffNavItems
      : portal === "FINANCE"
        ? financeNavItems
        : adminNavItems.filter((item) => item.roles.includes(role));
  return items.filter((item) => {
    if (item.href === "/settings") return can(role, "manageCompanySettings");
    return true;
  });
}

export function navSectionsFor(role: UserRole | undefined | null): NavSection[] {
  const portal = role ? effectivePortalRole(role) : null;
  const items = visibleNavItems(role);
  const order = portal === "EMPLOYEE" ? STAFF_GROUP_ORDER : NAV_GROUP_ORDER;
  return order
    .map((group) => ({
      group,
      label: NAV_GROUP_LABELS[group],
      items: items.filter((item) => item.group === group),
    }))
    .filter((section) => section.items.length > 0);
}

export function isNavActive(pathname: string, href: string) {
  if (href === "/staff") return pathname === "/staff";
  if (href === "/finance") return pathname === "/finance";
  return pathname === href || pathname.startsWith(`${href}/`);
}
