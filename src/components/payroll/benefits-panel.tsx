"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { employeeFullName, formatCurrency } from "@/lib/utils";
import { BENEFIT_KINDS, benefitKindLabel } from "@/lib/payroll/labels";

type StaffOption = {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
};

type PlanRow = {
  id: string;
  name: string;
  kind: string;
  employerCostKobo: string;
  employeeDeductionKobo: string;
  enrollments: Array<{
    id: string;
    status: string;
    employee: StaffOption;
  }>;
};

export function BenefitsPanel() {
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/benefits")
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
    const res = await fetch("/api/benefits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        kind: data.get("kind"),
        employerCostNaira: Number(data.get("employerCostNaira") || 0),
        employeeDeductionNaira: Number(data.get("employeeDeductionNaira") || 0),
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(json.error ?? "Could not save benefit");
      return;
    }
    form.reset();
    load();
  }

  async function enroll(planId: string, form: HTMLFormElement) {
    const employeeId = String(new FormData(form).get("employeeId") || "");
    if (!employeeId) return;
    setBusy(true);
    const res = await fetch(`/api/benefits/${planId}/enroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId, action: "enroll" }),
    });
    setBusy(false);
    if (!res.ok) {
      const json = await res.json();
      setMessage(json.error ?? "Could not enroll");
      return;
    }
    form.reset();
    load();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Benefits</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted">
          Employer cost is tracked here. If a plan has an employee deduction,
          that amount attaches as a BENEFIT_DEDUCTION line on draft payroll.
        </p>
        <form onSubmit={add} className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="name">Plan name</Label>
            <Input id="name" name="name" required placeholder="HMO" />
          </div>
          <div>
            <Label htmlFor="kind">Kind</Label>
            <select
              id="kind"
              name="kind"
              className="mt-1 flex h-9 w-full rounded-md border border-stone-300 px-3 text-sm"
            >
              {BENEFIT_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {benefitKindLabel(kind)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="employerCostNaira">Employer cost / month (₦)</Label>
            <Input
              id="employerCostNaira"
              name="employerCostNaira"
              type="number"
              min={0}
              defaultValue={0}
            />
          </div>
          <div>
            <Label htmlFor="employeeDeductionNaira">Staff deduction (₦)</Label>
            <Input
              id="employeeDeductionNaira"
              name="employeeDeductionNaira"
              type="number"
              min={0}
              defaultValue={0}
            />
          </div>
          <div>
            <Button type="submit" disabled={busy}>
              Save plan
            </Button>
          </div>
        </form>
        {message ? <p className="mb-3 text-sm text-red-700">{message}</p> : null}
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No benefit plans yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((row) => (
              <li key={row.id} className="py-3">
                <p className="font-medium text-ink">
                  {row.name} · {benefitKindLabel(row.kind)}
                </p>
                <p className="text-sm text-muted">
                  Employer {formatCurrency(row.employerCostKobo)} · Staff deduction{" "}
                  {formatCurrency(row.employeeDeductionKobo)}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {row.enrollments.filter((e) => e.status === "ACTIVE").length
                    ? row.enrollments
                        .filter((e) => e.status === "ACTIVE")
                        .map((e) =>
                          employeeFullName(e.employee.firstName, e.employee.lastName)
                        )
                        .join(", ")
                    : "No one enrolled"}
                </p>
                <form
                  className="mt-2 flex flex-wrap items-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    enroll(row.id, e.currentTarget);
                  }}
                >
                  <select
                    name="employeeId"
                    required
                    className="flex h-9 rounded-md border border-stone-300 px-3 text-sm"
                  >
                    <option value="">Enroll staff</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {employeeFullName(s.firstName, s.lastName)} ({s.employeeCode})
                      </option>
                    ))}
                  </select>
                  <Button type="submit" disabled={busy} variant="outline">
                    Enroll
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
