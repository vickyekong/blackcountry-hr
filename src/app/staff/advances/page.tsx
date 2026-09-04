"use client";

import { StaffAdvancesPanel } from "@/components/payroll/staff-advances-panel";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { HandCoins } from "lucide-react";

export default function StaffAdvancesPage() {
  return (
    <AppShell>
      <PageHeader
        icon={HandCoins}
        title="Advances"
        description="Request a salary advance. HR approves it, then repayment comes off your payslip in monthly instalments."
      />
      <StaffAdvancesPanel />
    </AppShell>
  );
}
