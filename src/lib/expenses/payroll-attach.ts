import type { Kobo } from "@/lib/money";
import type { PayrollRun } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ensureExpenseSchema } from "@/lib/ensure-expense-schema";
import { addExpenseReimbursements } from "@/lib/expenses/compensation";

export { addExpenseReimbursements };

export async function attachPayrollExpensesToDraftRun(options: {
  run: Pick<PayrollRun, "id" | "companyId" | "status">;
}) {
  if (options.run.status !== "DRAFT") return { attached: 0 };
  await ensureExpenseSchema();
  await detachPayrollExpensesFromRun(options.run.id, { keepReimbursed: false });

  const queued = await prisma.expenseClaim.findMany({
    where: {
      companyId: options.run.companyId,
      status: "APPROVED",
      reimbursementMethod: "PAYROLL",
      payrollRunId: null,
    },
    select: { id: true },
  });
  if (queued.length === 0) return { attached: 0 };

  await prisma.expenseClaim.updateMany({
    where: { id: { in: queued.map((row) => row.id) } },
    data: { payrollRunId: options.run.id },
  });
  return { attached: queued.length };
}

export async function expenseReimbursementKoboByEmployee(payrollRunId: string) {
  await ensureExpenseSchema();
  const rows = await prisma.expenseClaim.findMany({
    where: {
      payrollRunId,
      reimbursementMethod: "PAYROLL",
      status: { in: ["APPROVED", "REIMBURSED"] },
    },
    select: { employeeId: true, approvedAmountKobo: true },
  });
  const map = new Map<string, Kobo>();
  for (const row of rows) {
    const amount =
      row.approvedAmountKobo > 0n ? row.approvedAmountKobo : 0n;
    if (amount <= 0n) continue;
    map.set(row.employeeId, (map.get(row.employeeId) ?? 0n) + amount);
  }
  return map;
}

/**
 * Unlink claims from a reversed run. Paid payroll reimbursements go back to
 * approved so Finance can queue them again.
 */
export async function detachPayrollExpensesFromRun(
  payrollRunId: string,
  options?: { keepReimbursed?: boolean }
) {
  await ensureExpenseSchema();
  if (!options?.keepReimbursed) {
    await prisma.expenseClaim.updateMany({
      where: { payrollRunId, status: "REIMBURSED", reimbursementMethod: "PAYROLL" },
      data: {
        status: "APPROVED",
        reimbursedAt: null,
        reimbursedById: null,
        payrollRunId: null,
      },
    });
  }
  await prisma.expenseClaim.updateMany({
    where: { payrollRunId, status: "APPROVED", reimbursementMethod: "PAYROLL" },
    data: { payrollRunId: null },
  });
}

/** When Finance marks the run paid, payroll-queued claims become reimbursed. */
export async function markPayrollExpensesReimbursed(options: {
  payrollRunId: string;
  reimbursedById?: string | null;
  reimbursedAt?: Date;
}) {
  await ensureExpenseSchema();
  await prisma.expenseClaim.updateMany({
    where: {
      payrollRunId: options.payrollRunId,
      reimbursementMethod: "PAYROLL",
      status: "APPROVED",
    },
    data: {
      status: "REIMBURSED",
      reimbursedAt: options.reimbursedAt ?? new Date(),
      reimbursedById: options.reimbursedById ?? undefined,
    },
  });
}
