"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ExpensesPanel } from "@/components/expenses/expenses-panel";
import { cn } from "@/lib/cn";
import Link from "next/link";

const TABS = [
  { id: "claims", label: "Claims" },
  { id: "reimbursements", label: "Reimbursements" },
] as const;

function ExpensesBody() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab = tabParam === "reimbursements" ? "reimbursements" : "claims";

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Expenses</h1>
        <p className="mt-1 text-sm text-muted">
          Staff claims, approvals, and reimbursements. Payroll-queued amounts
          are non-taxable and do not change PAYE.
        </p>
      </div>
      <div className="mb-4 flex gap-2 border-b border-line">
        {TABS.map((item) => (
          <Link
            key={item.id}
            href={item.id === "claims" ? "/expenses" : "/expenses?tab=reimbursements"}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
              tab === item.id
                ? "border-ink text-ink"
                : "border-transparent text-muted hover:text-ink"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
      {tab === "claims" ? (
        <ExpensesPanel variant="review" />
      ) : (
        <ExpensesPanel variant="reimburse" />
      )}
    </>
  );
}

export default function ExpensesPage() {
  return (
    <AppShell>
      <Suspense>
        <ExpensesBody />
      </Suspense>
    </AppShell>
  );
}
