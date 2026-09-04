"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { employeeFullName, formatCurrency } from "@/lib/utils";
import {
  DEDUCTION_KINDS,
  deductionKindLabel,
} from "@/lib/payroll/labels";

type StaffOption = {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
};

type Row = {
  id: string;
  kind: string;
  amountKobo: string;
  description: string | null;
  status: string;
  employee: StaffOption;
};

export function DeductionsPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/deductions")
      .then((r) => r.json())
      .then((data) => setRows(Array.isArray(data) ? data : []));
    fetch("/api/employees")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setStaff(data);
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
    const res = await fetch("/api/deductions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: data.get("employeeId"),
        kind: data.get("kind"),
        amountNaira: Number(data.get("amountNaira") || 0),
        description: data.get("description") || undefined,
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(json.error ?? "Could not save deduction");
      return;
    }
    form.reset();
    load();
  }

  async function end(id: string) {
    setBusy(true);
    await fetch(`/api/deductions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ENDED" }),
    });
    setBusy(false);
    load();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recurring deductions</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted">
          Cooperative, union, and custom monthly amounts attach as other
          deductions on the next draft payroll run. PAYE, pension, and NHF stay
          in the statutory engine.
        </p>
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
                  {employeeFullName(s.firstName, s.lastName)} ({s.employeeCode})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="kind">Kind</Label>
            <select
              id="kind"
              name="kind"
              className="mt-1 flex h-9 w-full rounded-md border border-line px-3 text-sm"
            >
              {DEDUCTION_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {deductionKindLabel(kind)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="amountNaira">Amount / month (₦)</Label>
            <Input
              id="amountNaira"
              name="amountNaira"
              type="number"
              min={1}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Note</Label>
            <Input id="description" name="description" placeholder="Optional" />
          </div>
          <div>
            <Button type="submit" disabled={busy}>
              Add deduction
            </Button>
          </div>
        </form>
        {message ? <p className="mb-3 text-sm text-red-700">{message}</p> : null}
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No recurring deductions yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-ink">
                    {employeeFullName(row.employee.firstName, row.employee.lastName)}{" "}
                    · {deductionKindLabel(row.kind)}
                  </p>
                  <p className="text-sm text-muted">
                    {formatCurrency(row.amountKobo)}
                    {row.description ? ` · ${row.description}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{row.status === "ACTIVE" ? "Active" : "Ended"}</Badge>
                  {row.status === "ACTIVE" ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() => end(row.id)}
                    >
                      End
                    </Button>
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
