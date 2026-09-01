"use client";

import { WeeklyTimesheet } from "@/components/timesheets/weekly-timesheet";
import { AppShell } from "@/components/layout/app-shell";

export default function StaffTimesheetsPage() {
  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink">Timesheets</h1>
        <p className="mt-1 text-sm text-muted">
          Log hours for the week. HR validates the week; after that you cannot
          change it.
        </p>
      </div>
      <WeeklyTimesheet />
    </AppShell>
  );
}
