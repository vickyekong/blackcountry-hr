import type { UserRole } from "@prisma/client";

/** Group Super Admin, HR, and Finance may open the home company and its direct subsidiaries. */
export function canSwitchAcrossGroup(role: UserRole): boolean {
  return (
    role === "SUPER_ADMIN" || role === "HR_ADMIN" || role === "FINANCE"
  );
}
