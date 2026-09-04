"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { employeeFullName, formatCurrency, formatDate } from "@/lib/utils";
import { overtimeStatusLabel } from "@/lib/time/labels";

type StaffOption = {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
};

type OvertimeRow = {
  id: string;
  workDate: string;
  minutes: number;
  reason: string | null;
  status: string;
  amountKobo: string | number | null;
  payrollRunId: string | null;
  employee: StaffOption;
};

export function OvertimePanel() {
  const [rows, setRows] = useState<OvertimeRow[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/overtime")
      .then((r) => r.json())
      .then((data) => setRows(Array.isArray(data) ? data : []));
    fetch("/api/employees")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setStaff(
            data.map((emp: StaffOption) => ({
              id: emp.id,
              firstName: emp.firstName,
              lastName: emp.lastName,
              employeeCode: emp.employeeCode,
            }))
          );
        }
      })
      .catch(() => undefined);
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setMessage("");
    const data = new FormData(form);
    const hours = Number(data.get("hours") || 0);
    const minutes = Math.round(hours * 60);
    const res = await fetch("/api/overtime", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: data.get("employeeId"),
        workDate: data.get("workDate"),
        minutes,
        reason: data.get("reason") || undefined,
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(json.error ?? "Could not save overtime");
      return;
    }
    form.reset();
    load();
  }

  async function act(id: string, action: "approve" | "reject") {
    setBusy(true);
    const res = await fetch(`/api/overtime/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(json.error ?? "Update failed");
      return;
    }
    load();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Overtime requests</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted">
          Approved extra hours are added as an OVERTIME line on the next draft
          payroll run (1.5× weekday, 2× weekend/holiday on basic). Validated
          timesheet hours remain the source of weekly time and full-time
          overtime above a standard month.
        </p>
        <form onSubmit={add} className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Label htmlFor="employeeId">Employee</Label>
            <select
              id="employeeId"
              name="employeeId"
              required
              className="mt-1 flex h-9 w-full rounded-md border border-line px-3 text-sm"
            >
              <option value="">Select staff</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {employeeFullName(s.firstName, s.lastName)} ({s.employeeCode})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="workDate">Date</Label>
            <Input id="workDate" name="workDate" type="date" required />
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
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-5">
            <Label htmlFor="reason">Reason</Label>
            <Input id="reason" name="reason" placeholder="Optional" />
          </div>
          <div>
            <Button type="submit" disabled={busy}>
              Record overtime
            </Button>
          </div>
        </form>
        {message ? <p className="mb-3 text-sm text-red-700">{message}</p> : null}
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No overtime requests yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-ink">
                    {employeeFullName(row.employee.firstName, row.employee.lastName)} · {formatDate(row.workDate)}
                  </p>
                  <p className="text-sm text-muted">
                    {(row.minutes / 60).toFixed(2)} h
                    {row.amountKobo
                      ? ` · ${formatCurrency(Number(row.amountKobo))}`
                      : ""}
                    {row.reason ? ` · ${row.reason}` : ""}
                    {row.payrollRunId ? " · on draft payroll" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{overtimeStatusLabel(row.status)}</Badge>
                  {row.status === "PENDING" ? (
                    <>
                      <Button
                        type="button"
                        disabled={busy}
                        onClick={() => act(row.id, "approve")}
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={() => act(row.id, "reject")}
                      >
                        Reject
                      </Button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
