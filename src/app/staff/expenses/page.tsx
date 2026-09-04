"use client";

import { StaffExpensesPanel } from "@/components/expenses/staff-expenses-panel";
import { AppShell } from "@/components/layout/app-shell";

export default function StaffExpensesPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Expenses</h1>
        <p className="mt-1 text-sm text-muted">
          Submit a claim with a receipt. After approval, Finance reimburses by
          bank transfer, cash, or the next payroll (non-taxable).
        </p>
      </div>
      <StaffExpensesPanel />
    </AppShell>
  );
}
