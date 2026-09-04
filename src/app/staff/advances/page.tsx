"use client";

import { StaffAdvancesPanel } from "@/components/payroll/staff-advances-panel";
import { AppShell } from "@/components/layout/app-shell";

export default function StaffAdvancesPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Advances</h1>
        <p className="mt-1 text-sm text-muted">
          Request a salary advance. HR approves it, then repayment comes off
          your payslip in monthly instalments.
        </p>
      </div>
      <StaffAdvancesPanel />
    </AppShell>
  );
}
