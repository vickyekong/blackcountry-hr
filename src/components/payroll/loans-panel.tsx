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
  principalKobo: string;
  interestKobo: string;
  remainingKobo: string;
  installments: number;
  reason: string | null;
  status: string;
  employee: StaffOption;
};

export function LoansPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/loans")
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
    const res = await fetch("/api/loans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: data.get("employeeId"),
        principalNaira: Number(data.get("principalNaira") || 0),
        interestNaira: Number(data.get("interestNaira") || 0),
        installments: Number(data.get("installments") || 1),
        reason: data.get("reason") || undefined,
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(json.error ?? "Could not save loan");
      return;
    }
    form.reset();
    load();
  }

  async function act(id: string, action: "approve" | "reject") {
    setBusy(true);
    const res = await fetch(`/api/loans/${id}`, {
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
        <CardTitle>Staff loans</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted">
          Approved principal plus optional interest is recovered as
          LOAN_DEDUCTION lines on draft runs. Outstanding balance is what is
          still unpaid on approved or paid payroll.
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
            <Label htmlFor="principalNaira">Principal (₦)</Label>
            <Input
              id="principalNaira"
              name="principalNaira"
              type="number"
              min={1}
              required
            />
          </div>
          <div>
            <Label htmlFor="interestNaira">Interest (₦)</Label>
            <Input
              id="interestNaira"
              name="interestNaira"
              type="number"
              min={0}
              defaultValue={0}
            />
          </div>
          <div>
            <Label htmlFor="installments">Months</Label>
            <Input
              id="installments"
              name="installments"
              type="number"
              min={1}
              max={36}
              defaultValue={6}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="reason">Reason</Label>
            <Input id="reason" name="reason" placeholder="Optional" />
          </div>
          <div>
            <Button type="submit" disabled={busy}>
              Record loan
            </Button>
          </div>
        </form>
        {message ? <p className="mb-3 text-sm text-red-700">{message}</p> : null}
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No staff loans yet.</p>
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
                    Principal {formatCurrency(row.principalKobo)}
                    {Number(row.interestKobo) > 0
                      ? ` + interest ${formatCurrency(row.interestKobo)}`
                      : ""}{" "}
                    · remaining {formatCurrency(row.remainingKobo)} over{" "}
                    {row.installments} months
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
