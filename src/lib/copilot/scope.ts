import { can } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";
import type { CopilotIntent } from "@/lib/copilot/intents";
import { COPILOT_PROMPTS } from "@/lib/copilot/intents";

/** Permission that must hold before Omni Co-Pilot answers that intent. */
export function permissionForIntent(
  intent: CopilotIntent
): Parameters<typeof can>[1] | null {
  switch (intent) {
    case "salary_simulate":
      return "runPayroll";
    case "outstanding_loans":
      return "manageCompensation";
    case "dept_payroll_cost":
    case "payroll_why_up":
    case "turnover":
    case "dept_overtime":
      return "viewReports";
    case "late_repeat":
    case "contract_expiry":
    case "missing_timesheets":
    case "declining_performance":
    case "briefing":
      return "viewEmployees";
    case "unknown":
      return null;
  }
}

export function canAskIntent(role: UserRole, intent: CopilotIntent): boolean {
  const permission = permissionForIntent(intent);
  if (!permission) return false;
  return can(role, permission);
}

export function deniedMessage(intent: CopilotIntent): string {
  if (intent === "salary_simulate" || intent === "outstanding_loans") {
    return "That figure is payroll-confidential. HR or Super Admin can open it from Payroll.";
  }
  return "You do not have access to that answer from this seat.";
}

export function suggestedPromptsForRole(role: UserRole): string[] {
  return COPILOT_PROMPTS.filter((item) => canAskIntent(role, item.intent)).map(
    (item) => item.text
  );
}
