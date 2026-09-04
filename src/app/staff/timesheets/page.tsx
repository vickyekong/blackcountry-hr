"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { WeeklyTimesheet } from "@/components/timesheets/weekly-timesheet";
import { StaffOvertimePanel } from "@/components/time/staff-overtime-panel";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Clock, Timer } from "lucide-react";
import { cn } from "@/lib/cn";

function StaffTimesheetsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get("tab") === "overtime" ? "overtime" : "hours";

  return (
    <AppShell>
      <PageHeader
        icon={Clock}
        title="Timesheets"
        description="Log weekly hours against a project and task. HR validates the week before payroll uses it. Extra overtime is a separate request, not a clock punch."
      />
      <div className="mb-6 flex flex-wrap gap-1 border-b border-line">
        {(
          [
            { id: "hours", href: "/staff/timesheets", label: "Hours", icon: Clock },
            {
              id: "overtime",
              href: "/staff/timesheets?tab=overtime",
              label: "Overtime",
              icon: Timer,
            },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => router.push(item.href)}
            className={cn(
              "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition",
              tab === item.id
                ? "border-ink text-ink"
                : "border-transparent text-muted hover:text-ink"
            )}
          >
            <item.icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            {item.label}
          </button>
        ))}
      </div>
      {tab === "overtime" ? <StaffOvertimePanel /> : <WeeklyTimesheet />}
    </AppShell>
  );
}

export default function StaffTimesheetsPage() {
  return (
    <Suspense fallback={<p className="p-8 text-muted">Loading…</p>}>
      <StaffTimesheetsInner />
    </Suspense>
  );
}
