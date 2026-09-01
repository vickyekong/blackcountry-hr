import type { UserRole } from "@prisma/client";

/** Group Super Admin, HR, and Finance may open the group tree, including nested sub-companies. */
export function canSwitchAcrossGroup(role: UserRole): boolean {
  return (
    role === "SUPER_ADMIN" || role === "HR_ADMIN" || role === "FINANCE"
  );
}
