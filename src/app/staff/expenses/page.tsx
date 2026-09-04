"use client";

import { StaffExpensesPanel } from "@/components/expenses/staff-expenses-panel";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Receipt } from "lucide-react";

export default function StaffExpensesPage() {
  return (
    <AppShell>
      <PageHeader
        icon={Receipt}
        title="Expenses"
        description="Submit a claim with a receipt. After approval, Finance reimburses by bank transfer, cash, or the next payroll (non-taxable)."
      />
      <StaffExpensesPanel />
    </AppShell>
  );
}
