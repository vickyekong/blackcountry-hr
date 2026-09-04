"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { employeeFullName } from "@/lib/utils";
import { WEEKLY_CAPACITY_MINUTES, minutesToHours } from "@/lib/projects/workload";

type Row = {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
  };
  plannedHours: number;
  loggedHours: number;
  loadPercent: number;
  remainingMinutes: number;
  allocations: Array<{
    projectId: string;
    projectName: string;
    plannedMinutesPerWeek: number;
  }>;
};

export function WorkPlanningPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [weekStart, setWeekStart] = useState("");

  useEffect(() => {
    fetch("/api/projects/planning")
      .then((r) => r.json())
      .then((data) => {
        setRows(Array.isArray(data.rows) ? data.rows : []);
        setWeekStart(data.weekStart ?? "");
      });
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workload this week</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted">
          Planned hours come from project allocations. Logged hours are this
          week’s timesheets. Capacity is {minutesToHours(WEEKLY_CAPACITY_MINUTES)}{" "}
          hours (Mon–Fri × 8). Week of {weekStart || "—"}.
        </p>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No people allocated yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((row) => (
              <li
                key={row.employee.id}
                className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-ink">
                    {employeeFullName(
                      row.employee.firstName,
                      row.employee.lastName
                    )}
                  </p>
                  <p className="text-xs text-muted">
                    {row.allocations.length
                      ? row.allocations
                          .map(
                            (item) =>
                              `${item.projectName} ${minutesToHours(item.plannedMinutesPerWeek)}h`
                          )
                          .join(" · ")
                      : "No project allocation"}
                  </p>
                </div>
                <p className="text-sm tabular-nums text-ink-soft">
                  Planned {row.plannedHours}h · logged {row.loggedHours}h ·{" "}
                  {row.loadPercent}% of capacity
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
