"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ExpensesPanel } from "@/components/expenses/expenses-panel";
import { Receipt } from "lucide-react";

export default function FinanceExpensesPage() {
  return (
    <AppShell>
      <PageHeader
        icon={Receipt}
        title="Expenses"
        description="This is the company expense desk. HR, Super Admin, or the line manager clears a claim first — then you pay it here. Next-payroll reimbursements are non-taxable and do not change PAYE."
      />
      <div className="space-y-6">
        <ExpensesPanel variant="watch" />
        <ExpensesPanel variant="reimburse" />
      </div>
    </AppShell>
  );
}
