"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { employeeFullName, formatDate } from "@/lib/utils";
import {
  SHIFT_EXCEPTION_KINDS,
  shiftExceptionKindLabel,
} from "@/lib/time/labels";

type StaffOption = {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
};

type ShiftOption = { id: string; name: string };

type ExceptionRow = {
  id: string;
  workDate: string;
  kind: string;
  notes: string | null;
  employee: StaffOption;
  shift: ShiftOption | null;
};

export function ShiftExceptionsPanel() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [rows, setRows] = useState<ExceptionRow[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [shifts, setShifts] = useState<ShiftOption[]>([]);
  const [kind, setKind] = useState<(typeof SHIFT_EXCEPTION_KINDS)[number]>("OFF");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    fetch(`/api/attendance/exceptions?month=${month}&year=${year}`)
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
    fetch("/api/attendance/shifts")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setShifts(data.map((s: ShiftOption) => ({ id: s.id, name: s.name })));
        }
      })
      .catch(() => undefined);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setMessage("");
    const data = new FormData(form);
    const res = await fetch("/api/attendance/exceptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: data.get("employeeId"),
        workDate: data.get("workDate"),
        kind: data.get("kind"),
        shiftId: data.get("shiftId") || undefined,
        notes: data.get("notes") || undefined,
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(json.error ?? "Could not save exception");
      return;
    }
    form.reset();
    setKind("OFF");
    load();
  }

  async function remove(id: string) {
    setBusy(true);
    await fetch(`/api/attendance/exceptions/${id}`, { method: "DELETE" });
    setBusy(false);
    load();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shift exceptions</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted">
          One-off cover or a day off without changing the standing shift. Compile
          attendance after you save so the day is scored correctly.
        </p>
        <div className="mb-4 flex gap-3">
          <div>
            <Label htmlFor="exMonth">Month</Label>
            <Input
              id="exMonth"
              type="number"
              min={1}
              max={12}
              className="w-24"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value) || month)}
            />
          </div>
          <div>
            <Label htmlFor="exYear">Year</Label>
            <Input
              id="exYear"
              type="number"
              className="w-28"
              value={year}
              onChange={(e) => setYear(Number(e.target.value) || year)}
            />
          </div>
        </div>
        <form onSubmit={add} className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
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
                  {employeeFullName(s.firstName, s.lastName)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="workDate">Date</Label>
            <Input id="workDate" name="workDate" type="date" required />
          </div>
          <div>
            <Label htmlFor="kind">Exception</Label>
            <select
              id="kind"
              name="kind"
              className="mt-1 flex h-9 w-full rounded-md border border-line px-3 text-sm"
              value={kind}
              onChange={(e) =>
                setKind(e.target.value as (typeof SHIFT_EXCEPTION_KINDS)[number])
              }
            >
              {SHIFT_EXCEPTION_KINDS.map((value) => (
                <option key={value} value={value}>
                  {shiftExceptionKindLabel(value)}
                </option>
              ))}
            </select>
          </div>
          {kind === "SHIFT" ? (
            <div>
              <Label htmlFor="shiftId">Cover shift</Label>
              <select
                id="shiftId"
                name="shiftId"
                required
                className="mt-1 flex h-9 w-full rounded-md border border-line px-3 text-sm"
              >
                <option value="">Select shift</option>
                {shifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="sm:col-span-2 lg:col-span-4">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" placeholder="Optional" />
          </div>
          <div>
            <Button type="submit" disabled={busy}>
              Save exception
            </Button>
          </div>
        </form>
        {message ? <p className="mb-3 text-sm text-red-700">{message}</p> : null}
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No exceptions this month.</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-ink">
                    {employeeFullName(row.employee.firstName, row.employee.lastName)} · {formatDate(row.workDate)}
                  </p>
                  <p className="text-muted">
                    {shiftExceptionKindLabel(row.kind)}
                    {row.shift ? ` · ${row.shift.name}` : ""}
                    {row.notes ? ` · ${row.notes}` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => remove(row.id)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
