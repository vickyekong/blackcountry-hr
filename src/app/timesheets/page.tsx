"use client";

import { useEffect, useState } from "react";
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
import { formatDate } from "@/lib/utils";

type Project = { id: string; name: string; code: string | null; status: string };
type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  employmentType: string;
};
type Entry = {
  id: string;
  workDate: string;
  minutes: number;
  status: string;
  notes: string | null;
  employee: Employee;
  project: { id: string; name: string };
};

export default function TimesheetsPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/timesheets?status=SUBMITTED")
      .then((r) => r.json())
      .then((data) => setEntries(Array.isArray(data) ? data : []));
    fetch("/api/timesheets")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && entries.length === 0) {
          // keep submitted list primary; still fine
        }
      });
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []));
    fetch("/api/employees")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.employees;
        setEmployees(Array.isArray(list) ? list : []);
      });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function review(id: string, action: "approve" | "reject") {
    setBusy(true);
    const res = await fetch(`/api/timesheets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not update");
      return;
    }
    load();
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
    load();
  }

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink">Timesheets</h1>
        <p className="mt-1 text-sm text-muted">
          Staff log hours against company projects. Approve submitted time so it
          can feed the payroll period. HR can also log hours for contract staff.
        </p>
      </div>
      {error && <p className="mb-4 text-sm text-signal">{error}</p>}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Log hours for someone</CardTitle>
        </CardHeader>
        <CardContent>
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
                Save approved hours
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-line bg-foam">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{formatDate(row.workDate)}</TableCell>
                <TableCell>
                  {row.employee.firstName} {row.employee.lastName}
                </TableCell>
                <TableCell>{row.project.name}</TableCell>
                <TableCell>{(row.minutes / 60).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge>{row.status.replace(/_/g, " ")}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="brand"
                    disabled={busy}
                    onClick={() => void review(row.id, "approve")}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-2"
                    disabled={busy}
                    onClick={() => void review(row.id, "reject")}
                  >
                    Send back
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted">
                  No submitted timesheets waiting
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
