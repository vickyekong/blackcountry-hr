import { AppShell } from "@/components/layout/app-shell";
import { StaffPerformancePanel } from "@/components/talent/staff-performance-panel";

export default function StaffPerformancePage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Performance</h1>
        <p className="mt-1 text-sm text-muted">
          Your goals, self-assessment, and recognition. Reviews do not change
          pay — bonuses stay on payroll.
        </p>
      </div>
      <StaffPerformancePanel />
    </AppShell>
  );
}
