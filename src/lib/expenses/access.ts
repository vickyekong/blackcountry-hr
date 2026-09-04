import { can } from "@/lib/permissions";
import { canApproveExpense } from "@/lib/expenses/policy";
import type { UserRole } from "@prisma/client";
import type { Kobo } from "@/lib/money";

export function canListCompanyExpenses(role: UserRole) {
  return can(role, "reviewExpenses") || can(role, "reimburseExpenses");
}

export function canCreateExpenseForStaff(role: UserRole) {
  return can(role, "reviewExpenses");
}

export function canReimburseClaim(role: UserRole) {
  return can(role, "reimburseExpenses");
}

export function approverMayAct(options: {
  role: UserRole;
  amountKobo: Kobo;
  reviewerEmployeeId?: string | null;
  claimantManagerId?: string | null;
}) {
  const isLineManager = Boolean(
    options.reviewerEmployeeId &&
      options.claimantManagerId &&
      options.reviewerEmployeeId === options.claimantManagerId
  );
  return canApproveExpense({
    role: options.role,
    amountKobo: options.amountKobo,
    isLineManager,
  });
}
