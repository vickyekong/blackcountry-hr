"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ExpensesPanel } from "@/components/expenses/expenses-panel";

export default function FinanceExpensesPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Expense reimbursements</h1>
        <p className="mt-1 text-sm text-muted">
          Mark approved claims paid. You do not hire people or approve payroll.
          Next-payroll reimbursements are non-taxable.
        </p>
      </div>
      <ExpensesPanel variant="reimburse" />
    </AppShell>
  );
}
