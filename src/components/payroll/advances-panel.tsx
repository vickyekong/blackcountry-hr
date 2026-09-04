"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { employeeFullName, formatCurrency } from "@/lib/utils";
import { moneyRequestStatusLabel } from "@/lib/payroll/labels";

type StaffOption = {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
};

type Row = {
  id: string;
  requestedKobo: string;
  approvedKobo: string;
  remainingKobo: string;
  installments: number;
  reason: string | null;
  status: string;
  employee: StaffOption;
};

export function AdvancesPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/advances")
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
    const res = await fetch("/api/advances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: data.get("employeeId"),
        amountNaira: Number(data.get("amountNaira") || 0),
        installments: Number(data.get("installments") || 1),
        reason: data.get("reason") || undefined,
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(json.error ?? "Could not save advance");
      return;
    }
    form.reset();
    load();
  }

  async function act(id: string, action: "approve" | "reject") {
    setBusy(true);
    const res = await fetch(`/api/advances/${id}`, {
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
        <CardTitle>Salary advances</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted">
          Approved advances repay on draft payroll as ADVANCE deductions, split
          across the installment months. Super Admin still signs off the run
          before Finance processes it.
        </p>
        <form onSubmit={add} className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="employeeId">Employee</Label>
            <select
              id="employeeId"
              name="employeeId"
              required
              className="mt-1 flex h-9 w-full rounded-md border border-stone-300 px-3 text-sm"
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
            <Label htmlFor="amountNaira">Amount (₦)</Label>
            <Input id="amountNaira" name="amountNaira" type="number" min={1} required />
          </div>
          <div>
            <Label htmlFor="installments">Months</Label>
            <Input
              id="installments"
              name="installments"
              type="number"
              min={1}
              max={24}
              defaultValue={3}
              required
            />
          </div>
          <div>
            <Label htmlFor="reason">Reason</Label>
            <Input id="reason" name="reason" placeholder="Optional" />
          </div>
          <div>
            <Button type="submit" disabled={busy}>
              Record advance
            </Button>
          </div>
        </form>
        {message ? <p className="mb-3 text-sm text-red-700">{message}</p> : null}
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No salary advances yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-ink">
                    {employeeFullName(row.employee.firstName, row.employee.lastName)}
                  </p>
                  <p className="text-sm text-muted">
                    Requested {formatCurrency(row.requestedKobo)} · remaining{" "}
                    {formatCurrency(row.remainingKobo)} over {row.installments} month
                    {row.installments === 1 ? "" : "s"}
                    {row.reason ? ` · ${row.reason}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{moneyRequestStatusLabel(row.status)}</Badge>
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
