"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { employeeFullName, formatCurrency } from "@/lib/utils";

type StaffOption = {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
};

type StructureRow = {
  id: string;
  name: string;
  grade: string | null;
  basicSalaryKobo: string;
  housingAllowanceKobo: string;
  transportAllowanceKobo: string;
  feedingAllowanceKobo: string;
  medicalAllowanceKobo: string;
  communicationAllowanceKobo: string;
  otherTaxableAllowancesKobo: string;
  nonTaxableReimbursementsKobo: string;
  _count: { employees: number };
};

export function StructuresPanel() {
  const [rows, setRows] = useState<StructureRow[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/salary-structures")
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
    const res = await fetch("/api/salary-structures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        grade: String(data.get("grade") || "").trim() || null,
        basicNaira: Number(data.get("basicNaira") || 0),
        housingNaira: Number(data.get("housingNaira") || 0),
        transportNaira: Number(data.get("transportNaira") || 0),
        feedingNaira: Number(data.get("feedingNaira") || 0),
        medicalNaira: Number(data.get("medicalNaira") || 0),
        communicationNaira: Number(data.get("communicationNaira") || 0),
        otherTaxableNaira: Number(data.get("otherTaxableNaira") || 0),
        nonTaxableNaira: Number(data.get("nonTaxableNaira") || 0),
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(json.error ?? "Could not save structure");
      return;
    }
    form.reset();
    load();
  }

  async function apply(id: string, form: HTMLFormElement) {
    const employeeId = String(new FormData(form).get("employeeId") || "");
    if (!employeeId) return;
    setBusy(true);
    const res = await fetch(`/api/salary-structures/${id}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeIds: [employeeId] }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(json.error ?? "Could not apply structure");
      return;
    }
    form.reset();
    load();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Salary structures</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted">
          Templates copy onto the staff record. PAYE still reads the employee
          compensation fields — applying a structure does not rewrite the
          calculator.
        </p>
        <form
          onSubmit={add}
          className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div className="sm:col-span-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="e.g. Officer band" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="grade">Grade (optional)</Label>
            <Input id="grade" name="grade" placeholder="e.g. GL 08" />
          </div>
          {(
            [
              ["basicNaira", "Basic"],
              ["housingNaira", "Housing"],
              ["transportNaira", "Transport"],
              ["feedingNaira", "Feeding"],
              ["medicalNaira", "Medical"],
              ["communicationNaira", "Communication"],
              ["otherTaxableNaira", "Other taxable"],
              ["nonTaxableNaira", "Non-taxable"],
            ] as const
          ).map(([name, label]) => (
            <div key={name}>
              <Label htmlFor={name}>{label} (₦)</Label>
              <Input
                id={name}
                name={name}
                type="number"
                min={0}
                step={1000}
                defaultValue={name === "basicNaira" ? "" : 0}
                required={name === "basicNaira"}
              />
            </div>
          ))}
          <div>
            <Button type="submit" disabled={busy}>
              Save structure
            </Button>
          </div>
        </form>
        {message ? <p className="mb-3 text-sm text-red-700">{message}</p> : null}
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No salary structures yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((row) => (
              <li key={row.id} className="py-3">
                <p className="font-medium text-ink">
                  {row.name}
                  {row.grade ? (
                    <span className="ml-2 text-sm font-normal text-muted">
                      {row.grade}
                    </span>
                  ) : null}
                </p>
                <p className="text-sm text-muted">
                  Basic {formatCurrency(row.basicSalaryKobo)} · Housing{" "}
                  {formatCurrency(row.housingAllowanceKobo)} · Transport{" "}
                  {formatCurrency(row.transportAllowanceKobo)} · {row._count.employees}{" "}
                  assigned
                </p>
                <form
                  className="mt-2 flex flex-wrap items-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    apply(row.id, e.currentTarget);
                  }}
                >
                  <select
                    name="employeeId"
                    required
                    className="flex h-9 rounded-md border border-line px-3 text-sm"
                  >
                    <option value="">Assign to staff</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {employeeFullName(s.firstName, s.lastName)} ({s.employeeCode})
                      </option>
                    ))}
                  </select>
                  <Button type="submit" disabled={busy} variant="outline">
                    Copy onto record
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
