import type { UserRole } from "@prisma/client";

/**
 * Five portals:
 *   Super Admin — payroll sign-off, sensitive change requests, Settings, group tree
 *   HR — people ops; seeks Super Admin clearance on payroll & bank/tax updates
 *   Finance — processes approved payroll; does not hire or create logins
 *   Business head — one sub-company; files, projects, timesheets; not payroll approve
 *   Staff — own profile, leave, timesheets, and company requests only
 */
export const PORTAL_ROLES = [
  "SUPER_ADMIN",
  "HR_ADMIN",
  "FINANCE",
  "BUSINESS_HEAD",
  "EMPLOYEE",
] as const;
export type PortalRole = (typeof PORTAL_ROLES)[number];

export const ADMIN_PORTAL_ROLES = ["SUPER_ADMIN", "HR_ADMIN"] as const;

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 5,
  HR_ADMIN: 4,
  BUSINESS_HEAD: 3,
  FINANCE: 2,
  EMPLOYEE: 1,
};

export function effectivePortalRole(role: UserRole): PortalRole | null {
  if (
    role === "SUPER_ADMIN" ||
    role === "HR_ADMIN" ||
    role === "FINANCE" ||
    role === "BUSINESS_HEAD" ||
    role === "EMPLOYEE"
  ) {
    return role;
  }
  return null;
}

export function isStaffRole(role: UserRole): boolean {
  return effectivePortalRole(role) === "EMPLOYEE";
}

export function isAdminPortalRole(role: UserRole): boolean {
  const portal = effectivePortalRole(role);
  return portal === "SUPER_ADMIN" || portal === "HR_ADMIN";
}

export function isFinanceRole(role: UserRole): boolean {
  return role === "FINANCE";
}

export function isBusinessHeadRole(role: UserRole): boolean {
  return role === "BUSINESS_HEAD";
}

export function hasMinRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export const PERMISSIONS = {
  /** Settings page + Google Workspace / company integrations */
  manageCompanySettings: ["SUPER_ADMIN", "HR_ADMIN"] as UserRole[],
  /** PAYE bands and statutory rates — Super Admin only */
  manageStatutoryRates: ["SUPER_ADMIN"] as UserRole[],
  /** Register a sub-company under the group */
  manageGroupCompanies: ["SUPER_ADMIN"] as UserRole[],
  manageEmployees: ["SUPER_ADMIN", "HR_ADMIN"] as UserRole[],
  viewEmployees: ["SUPER_ADMIN", "HR_ADMIN", "BUSINESS_HEAD"] as UserRole[],
  /** Salary / allowance edits on staff records */
  manageCompensation: ["SUPER_ADMIN", "HR_ADMIN"] as UserRole[],
  /** Clock machine, shifts, attendance compile (legacy) */
  manageAttendance: ["SUPER_ADMIN", "HR_ADMIN"] as UserRole[],
  /** Company inbox triage, assign, draft replies */
  manageHrDesk: ["SUPER_ADMIN", "HR_ADMIN"] as UserRole[],
  runPayroll: ["SUPER_ADMIN", "HR_ADMIN"] as UserRole[],
  /** Final payroll sign-off — Super Admin only (HR submits for approval) */
  approvePayroll: ["SUPER_ADMIN"] as UserRole[],
  /** After Super Admin approval, HR forwards the run to Finance */
  forwardPayrollToFinance: ["SUPER_ADMIN", "HR_ADMIN"] as UserRole[],
  /** Finance starts and completes payment processing */
  processPayrollFinance: ["FINANCE"] as UserRole[],
  /** Bank / tax-relief changes — Super Admin signs off */
  approveChangeRequests: ["SUPER_ADMIN"] as UserRole[],
  /** Next of kin, address, and general staff requests — HR or Super Admin */
  reviewStaffRequests: ["SUPER_ADMIN", "HR_ADMIN"] as UserRole[],
  viewReports: ["SUPER_ADMIN", "HR_ADMIN", "FINANCE", "BUSINESS_HEAD"] as UserRole[],
  viewAuditLog: ["SUPER_ADMIN", "HR_ADMIN", "FINANCE"] as UserRole[],
  /** Month-range CSV export of the audit log */
  exportAuditLog: ["SUPER_ADMIN", "HR_ADMIN"] as UserRole[],
  manageLeave: ["SUPER_ADMIN", "HR_ADMIN"] as UserRole[],
  viewPayslips: ["SUPER_ADMIN", "HR_ADMIN", "FINANCE", "EMPLOYEE"] as UserRole[],
  /** Staff portal — own record only */
  accessStaffPortal: ["EMPLOYEE"] as UserRole[],
  accessFinancePortal: ["FINANCE"] as UserRole[],
  manageProjects: ["SUPER_ADMIN", "HR_ADMIN", "BUSINESS_HEAD"] as UserRole[],
  reviewTimesheets: ["SUPER_ADMIN", "HR_ADMIN", "BUSINESS_HEAD"] as UserRole[],
  editWorkspaceFiles: ["SUPER_ADMIN", "HR_ADMIN", "BUSINESS_HEAD"] as UserRole[],
  viewWorkspaceFiles: [
    "SUPER_ADMIN",
    "HR_ADMIN",
    "BUSINESS_HEAD",
    "EMPLOYEE",
  ] as UserRole[],
};

export function can(
  userRole: UserRole,
  permission: keyof typeof PERMISSIONS
): boolean {
  return PERMISSIONS[permission].includes(userRole);
}

const SENSITIVE_CHANGE_TYPES = new Set(["BANK", "TAX_RELIEF"]);

/** Super Admin for bank/tax; HR or Super Admin for other staff requests. */
export function canReviewChangeType(role: UserRole, type: string): boolean {
  if (SENSITIVE_CHANGE_TYPES.has(type)) {
    return can(role, "approveChangeRequests");
  }
  return can(role, "reviewStaffRequests");
}

export function portalLabel(role: UserRole): string {
  const portal = effectivePortalRole(role);
  if (portal === "SUPER_ADMIN") return "Super Admin";
  if (portal === "HR_ADMIN") return "HR";
  if (portal === "FINANCE") return "Finance";
  if (portal === "BUSINESS_HEAD") return "Business head";
  if (portal === "EMPLOYEE") return "Staff";
  return "No access";
}

export function homePathForRole(role: UserRole): string {
  if (isStaffRole(role)) return "/staff";
  if (isFinanceRole(role)) return "/finance";
  if (isAdminPortalRole(role) || isBusinessHeadRole(role)) return "/dashboard";
  return "/login";
}
