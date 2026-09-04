import { nairaToKobo } from "@/lib/money";
import type { Kobo } from "@/lib/money";
import type { UserRole } from "@prisma/client";

/** ₦0–₦100,000 → manager / HR. */
export const EXPENSE_MANAGER_MAX_KOBO = nairaToKobo(100_000);
/** ₦500,001+ → Super Admin (executive) sign-off. */
export const EXPENSE_EXEC_MIN_KOBO = nairaToKobo(500_001);

export const EXPENSE_CATEGORIES = [
  "TRAVEL",
  "MEALS",
  "ACCOMMODATION",
  "TRANSPORT",
  "SUPPLIES",
  "OTHER",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  TRAVEL: "Travel",
  MEALS: "Meals",
  ACCOMMODATION: "Accommodation",
  TRANSPORT: "Transport",
  SUPPLIES: "Supplies",
  OTHER: "Other",
};

export const EXPENSE_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "REIMBURSED",
] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  REIMBURSED: "Reimbursed",
};

export const REIMBURSEMENT_METHODS = [
  "BANK_TRANSFER",
  "CASH",
  "PAYROLL",
] as const;
export type ReimbursementMethod = (typeof REIMBURSEMENT_METHODS)[number];

export const REIMBURSEMENT_METHOD_LABELS: Record<ReimbursementMethod, string> =
  {
    BANK_TRANSFER: "Bank transfer",
    CASH: "Cash",
    PAYROLL: "Next payroll (non-taxable)",
  };

export function expenseCategoryLabel(kind: string) {
  return EXPENSE_CATEGORY_LABELS[kind as ExpenseCategory] ?? kind;
}

export function expenseStatusLabel(status: string) {
  return EXPENSE_STATUS_LABELS[status as ExpenseStatus] ?? status;
}

export function reimbursementMethodLabel(method: string) {
  return (
    REIMBURSEMENT_METHOD_LABELS[method as ReimbursementMethod] ?? method
  );
}

export function requiresExecutiveApproval(amountKobo: Kobo) {
  return amountKobo >= EXPENSE_EXEC_MIN_KOBO;
}

export function isManagerBand(amountKobo: Kobo) {
  return amountKobo > 0n && amountKobo <= EXPENSE_MANAGER_MAX_KOBO;
}

/**
 * Who may approve a pending claim.
 * Super Admin can always approve.
 * HR can approve up to ₦500,000.
 * Line manager (linked staff record) can approve up to ₦100,000 for their reports.
 */
export function canApproveExpense(options: {
  role: UserRole;
  amountKobo: Kobo;
  isLineManager?: boolean;
}) {
  if (options.role === "SUPER_ADMIN") return true;
  if (requiresExecutiveApproval(options.amountKobo)) return false;
  if (options.role === "HR_ADMIN") return true;
  if (options.isLineManager && isManagerBand(options.amountKobo)) return true;
  return false;
}

export function approvalHint(amountKobo: Kobo) {
  if (requiresExecutiveApproval(amountKobo)) {
    return "Super Admin clearance required (above ₦500,000)";
  }
  if (isManagerBand(amountKobo)) {
    return "Line manager or HR can approve";
  }
  return "HR can approve; Finance reimburses on the Finance portal";
}
