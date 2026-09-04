"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReportStat } from "@/components/reports/report-stat";

type TimePayload = {
  approvedHours: number;
  hoursByDepartment: Array<{ department: string; hours: number }>;
  weeks: Array<{ key: string; count: number }>;
  leaveDays: number;
  leaveByType: Array<{ type: string; days: number }>;
  clock: {
    hasData: boolean;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    lateHours: number;
    attendanceRate: number | null;
    byStatus: Array<{ key: string; count: number }>;
  };
  overtimeRequestHours: number;
  expectedHoursNote: string;
};

export function TimeAnalyticsPanel({ year }: { year: number }) {
  const [time, setTime] = useState<TimePayload | null>(null);

  useEffect(() => {
    fetch(`/api/reports/analytics?year=${year}`)
      .then((r) => r.json())
      .then((data) => setTime(data.time ?? null))
      .catch(() => setTime(null));
  }, [year]);

  if (!time) {
    return <p className="text-sm text-muted">Loading time analytics…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          Timesheets are the source of hours for payroll. Clock figures appear
          only when attendance days were compiled. {time.expectedHoursNote}.
        </p>
        <Button variant="outline" size="sm" asChild>
          <a
            href={`/api/reports/analytics/export?year=${year}&kind=time`}
            download
          >
            Export CSV
          </a>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReportStat
          label="Approved timesheet hours"
          value={String(time.approvedHours)}
        />
        <ReportStat label="Approved leave days" value={String(time.leaveDays)} />
        <ReportStat
          label="Clock attendance"
          value={
            time.clock.attendanceRate == null
              ? "—"
              : `${time.clock.attendanceRate}%`
          }
        />
        <ReportStat
          label="Approved overtime hours"
          value={String(time.overtimeRequestHours)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Hours by department</CardTitle>
          </CardHeader>
          <CardContent>
            {time.hoursByDepartment.length === 0 ? (
              <p className="text-sm text-muted">No approved hours this year.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={time.hoursByDepartment}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                  <XAxis dataKey="department" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="hours" fill="#44403c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leave by type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {time.leaveByType.length === 0 ? (
              <p className="text-muted">No approved leave overlapping {year}.</p>
            ) : (
              time.leaveByType.map((row) => (
                <div key={row.type} className="flex justify-between">
                  <span className="text-muted">{row.type.replace(/_/g, " ")}</span>
                  <span className="tabular-nums font-medium">{row.days} days</span>
                </div>
              ))
            )}
            <div className="border-t border-line pt-3 text-xs text-muted">
              Timesheet weeks:{" "}
              {time.weeks.length
                ? time.weeks
                    .map((w) => `${w.count} ${w.key.toLowerCase()}`)
                    .join(" · ")
                : "none this year"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clock comparison</CardTitle>
          <p className="text-sm text-muted">
            Late / absent / early (partial) from compiled attendance days — not
            used for pay.
          </p>
        </CardHeader>
        <CardContent>
          {!time.clock.hasData ? (
            <p className="text-sm text-muted">
              No clock days in {year}. Use Employees → Attendance if a site still
              compiles punches.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-4 text-sm">
              <p>
                Present{" "}
                <span className="font-medium tabular-nums">
                  {time.clock.presentDays}
                </span>
              </p>
              <p>
                Absent{" "}
                <span className="font-medium tabular-nums">
                  {time.clock.absentDays}
                </span>
              </p>
              <p>
                Late{" "}
                <span className="font-medium tabular-nums">
                  {time.clock.lateDays}
                </span>{" "}
                ({time.clock.lateHours}h)
              </p>
              <p>
                Rate{" "}
                <span className="font-medium tabular-nums">
                  {time.clock.attendanceRate ?? "—"}
                  {time.clock.attendanceRate != null ? "%" : ""}
                </span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
