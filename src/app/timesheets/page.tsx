"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WeeklyTimesheet } from "@/components/timesheets/weekly-timesheet";
import { HolidaysPanel } from "@/components/time/holidays-panel";
import { OvertimePanel } from "@/components/time/overtime-panel";
import { can } from "@/lib/permissions";
import { cn } from "@/lib/cn";
import type { UserRole } from "@prisma/client";

type ProjectTask = { id: string; name: string; status: string };
type Project = {
  id: string;
  name: string;
  code: string | null;
  status: string;
  tasks?: ProjectTask[];
};
type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  employmentType: string;
};
type WeekRow = {
  employeeId: string;
  employee: Employee;
  weekStart: string;
  label: string;
  status: string;
  locked: boolean;
  returnReason: string | null;
  totalMinutes: number;
  entries: Array<{
    id: string;
    workDate: string;
    minutes: number;
    status: string;
    project: { name: string };
    task?: { name: string };
  }>;
};

export default function TimesheetsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = session?.user?.role as UserRole | undefined;
  const validator = role ? can(role, "validateTimesheets") : false;
  const logger = role ? can(role, "logTimesheets") : false;
  const hasLinkedRecord = Boolean(session?.user?.employeeId);
  const tabParam = searchParams.get("tab");
  const tab =
    validator && (tabParam === "holidays" || tabParam === "overtime")
      ? tabParam
      : "hours";

  const [weeks, setWeeks] = useState<WeekRow[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [logProjectId, setLogProjectId] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function loadQueue() {
    fetch("/api/timesheets/weeks?pending=1")
      .then((r) => r.json())
      .then((data) => setWeeks(Array.isArray(data.weeks) ? data.weeks : []));
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setProjects(list);
        setLogProjectId((current) =>
          current || list.find((p: Project) => p.status === "ACTIVE")?.id || ""
        );
      });
    fetch("/api/employees")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.employees;
        setEmployees(Array.isArray(list) ? list : []);
      });
  }

  useEffect(() => {
    if (validator) loadQueue();
  }, [validator]);

  async function review(
    employeeId: string,
    weekStart: string,
    action: "validate" | "return"
  ) {
    setBusy(true);
    setError("");
    let reason: string | undefined;
    if (action === "return") {
      const typed = window.prompt("Reason to send back (optional)");
      if (typed === null) {
        setBusy(false);
        return;
      }
      reason = typed;
    }
    const res = await fetch("/api/timesheets/weeks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId, weekStart, action, reason }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not update the week");
      return;
    }
    loadQueue();
  }

  async function logForStaff(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const hours = Number(form.get("hours"));
    const res = await fetch("/api/timesheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: form.get("employeeId"),
        projectId: form.get("projectId"),
        taskId: form.get("taskId"),
        workDate: form.get("workDate"),
        minutes: Math.round(hours * 60),
        notes: form.get("notes") || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not save hours");
      return;
    }
    e.currentTarget.reset();
    loadQueue();
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Timesheets</h1>
        <p className="mt-1 text-sm text-muted">
          Weekly hours against a project and task are the source of time for
          payroll. Validate a week to lock it. Holidays affect leave day
          counts; extra overtime requests attach to the next draft run.
        </p>
      </div>
      {validator ? (
        <div className="mb-6 flex flex-wrap gap-1 border-b border-line">
          {(
            [
              { id: "hours", label: "Hours" },
              { id: "holidays", label: "Holidays" },
              { id: "overtime", label: "Overtime" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                router.push(
                  item.id === "hours" ? "/timesheets" : `/timesheets?tab=${item.id}`
                )
              }
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
      ) : null}

      {tab === "holidays" && validator ? <HolidaysPanel /> : null}
      {tab === "overtime" && validator ? <OvertimePanel /> : null}
      {tab === "hours" ? (
        <>
      {error && <p className="mb-4 text-sm text-signal">{error}</p>}

      {logger && hasLinkedRecord && (
        <div className="mb-10">
          <WeeklyTimesheet />
        </div>
      )}

      {logger && !hasLinkedRecord && !validator && (
        <p className="mb-8 text-sm text-muted">
          Ask HR to link your staff record so you can log weekly hours.
        </p>
      )}

      {validator && (
        <>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Log hours for someone</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-xs text-muted">
                Use this for contract staff who have no portal. Hours stay
                submitted until you validate the week.
              </p>
              <form onSubmit={logForStaff} className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="employeeId">Staff</Label>
                  <select
                    id="employeeId"
                    name="employeeId"
                    required
                    className="mt-1 flex h-9 w-full rounded-md border border-stone-300 px-3 text-sm"
                  >
                    <option value="">Select</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeCode})
                        {emp.employmentType === "CONTRACT" ? " · contract" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="projectId">Project</Label>
                  <select
                    id="projectId"
                    name="projectId"
                    required
                    value={logProjectId}
                    onChange={(e) => setLogProjectId(e.target.value)}
                    className="mt-1 flex h-9 w-full rounded-md border border-stone-300 px-3 text-sm"
                  >
                    <option value="">Select</option>
                    {projects
                      .filter((p) => p.status === "ACTIVE")
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="taskId">Task</Label>
                  <select
                    id="taskId"
                    name="taskId"
                    required
                    className="mt-1 flex h-9 w-full rounded-md border border-stone-300 px-3 text-sm"
                  >
                    <option value="">Select</option>
                    {(
                      projects.find((p) => p.id === logProjectId)?.tasks ?? []
                    )
                      .filter((t) => t.status === "ACTIVE")
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="workDate">Date</Label>
                  <Input id="workDate" name="workDate" type="date" required className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="hours">Hours</Label>
                  <Input
                    id="hours"
                    name="hours"
                    type="number"
                    min={0.25}
                    step={0.25}
                    required
                    className="mt-1"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input id="notes" name="notes" className="mt-1" />
                </div>
                <div>
                  <Button type="submit" variant="brand" disabled={busy}>
                    Save submitted hours
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="rounded-lg border border-line bg-foam">
            <div className="border-b border-line px-4 py-3">
              <p className="text-sm font-medium text-ink">Weeks waiting for validation</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Week</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Detail</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {weeks.map((row) => (
                  <TableRow key={`${row.employeeId}-${row.weekStart}`}>
                    <TableCell>
                      <div>{row.label}</div>
                      <Badge className="mt-1">{row.status.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      {row.employee.firstName} {row.employee.lastName}
                    </TableCell>
                    <TableCell>{(row.totalMinutes / 60).toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-muted">
                      {row.entries
                        .map(
                          (entry) =>
                            `${entry.project.name}${
                              entry.task ? ` / ${entry.task.name}` : ""
                            } ${(entry.minutes / 60).toFixed(2)}h`
                        )
                        .join(" · ")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="brand"
                        disabled={busy}
                        onClick={() =>
                          void review(row.employeeId, row.weekStart, "validate")
                        }
                      >
                        Validate week
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-2"
                        disabled={busy}
                        onClick={() =>
                          void review(row.employeeId, row.weekStart, "return")
                        }
                      >
                        Send back
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {weeks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted">
                      No weeks waiting for validation
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
        </>
      ) : null}
    </AppShell>
  );
}
