import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { StaffPerformancePanel } from "@/components/talent/staff-performance-panel";
import { Target } from "lucide-react";

export default function StaffPerformancePage() {
  return (
    <AppShell>
      <PageHeader
        icon={Target}
        title="Performance"
        description="Your goals, self-assessment, and recognition. Reviews do not change pay — bonuses stay on payroll."
      />
      <StaffPerformancePanel />
    </AppShell>
  );
}
