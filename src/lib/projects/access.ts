import { can } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

export function canManageTaskProgress(options: {
  role: UserRole;
  employeeId?: string | null;
  assigneeEmployeeId?: string | null;
}) {
  if (can(options.role, "manageProjects")) return true;
  return Boolean(
    options.employeeId &&
      options.assigneeEmployeeId &&
      options.employeeId === options.assigneeEmployeeId
  );
}
