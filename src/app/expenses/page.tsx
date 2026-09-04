"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ExpensesPanel } from "@/components/expenses/expenses-panel";
import { Receipt } from "lucide-react";

export default function ExpensesPage() {
  return (
    <AppShell>
      <PageHeader
        icon={Receipt}
        title="Expenses"
        description="Expense reports are submitted here to HR and Super Admin. Approve or send them back. Finance pays cleared claims on the Finance portal."
      />
      <ExpensesPanel variant="review" />
    </AppShell>
  );
}
