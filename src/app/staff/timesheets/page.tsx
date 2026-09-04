"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { WeeklyTimesheet } from "@/components/timesheets/weekly-timesheet";
import { StaffOvertimePanel } from "@/components/time/staff-overtime-panel";
import { AppShell } from "@/components/layout/app-shell";
import { cn } from "@/lib/cn";

function StaffTimesheetsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get("tab") === "overtime" ? "overtime" : "hours";

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Timesheets</h1>
        <p className="mt-1 text-sm text-muted">
          Log weekly hours against a project and task. HR validates the week
          before payroll uses it. Extra overtime is a separate request, not a
          clock punch.
        </p>
      </div>
      <div className="mb-6 flex flex-wrap gap-1 border-b border-line">
        {(
          [
            { id: "hours", href: "/staff/timesheets", label: "Hours" },
            {
              id: "overtime",
              href: "/staff/timesheets?tab=overtime",
              label: "Overtime",
            },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => router.push(item.href)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition",
              tab === item.id
                ? "border-stone-900 text-stone-900"
                : "border-transparent text-stone-500 hover:text-stone-800"
            )}
          >
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
