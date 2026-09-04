"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TRAINING_STATUSES,
  TRAINING_STATUS_LABELS,
} from "@/lib/talent/labels";
import { employeeFullName } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { GraduationCap } from "lucide-react";

type Enrollment = {
  id: string;
  status: string;
  assignedAt: string;
  completedAt: string | null;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
  };
};

type Program = {
  id: string;
  name: string;
  description: string | null;
  required: boolean;
  enrollmentCount: number;
  enrollments: Enrollment[];
};

type StaffOption = {
  id: string;
  firstName: string;
  lastName: string;
};

export function TrainingWorkspace({ canManage }: { canManage: boolean }) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/training")
      .then((r) => r.json())
      .then((data) => setPrograms(Array.isArray(data) ? data : []));
    fetch("/api/employees")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setStaff(
            data.map((emp: StaffOption) => ({
              id: emp.id,
              firstName: emp.firstName,
              lastName: emp.lastName,
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
    const res = await fetch("/api/training", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.programName.value,
        description: form.description.value || null,
        required: form.required.checked,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? "Could not create programme");
      return;
    }
    form.reset();
    load();
  }

  async function enroll(programId: string, form: HTMLFormElement) {
    const employeeId = String(form.employeeId.value || "");
    const status = String(form.status.value || "ASSIGNED");
    if (!employeeId) return;
    setBusy(true);
    await fetch(`/api/training/${programId}/enroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId, status }),
    });
    setBusy(false);
    load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={GraduationCap}
        title="Training"
        description="Programmes and enrolment. Required orientation can be ticked off on the employee onboarding checklist once someone is assigned."
      />

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>New programme</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void add(e)} className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="programName">Name</Label>
                <Input id="programName" name="programName" className="mt-1" required />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" className="mt-1" />
              </div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" name="required" />
                Required (orientation / compliance)
              </label>
              <div>
                <Button type="submit" disabled={busy}>
                  {busy ? "Saving…" : "Add programme"}
                </Button>
              </div>
            </form>
            {message && <p className="mt-3 text-sm text-red-600">{message}</p>}
          </CardContent>
        </Card>
      )}

      {programs.length === 0 ? (
        <p className="text-sm text-muted">No programmes yet.</p>
      ) : (
        programs.map((program) => (
          <Card key={program.id}>
            <CardHeader>
              <CardTitle>
                {program.name}
                {program.required ? " · required" : ""}
              </CardTitle>
              {program.description && (
                <p className="text-sm text-muted">{program.description}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {canManage && (
                <form
                  className="flex flex-wrap items-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void enroll(program.id, e.currentTarget);
                  }}
                >
                  <select
                    name="employeeId"
                    className="h-9 rounded-md border border-line px-2 text-sm"
                    required
                  >
                    <option value="">Assign staff…</option>
                    {staff.map((person) => (
                      <option key={person.id} value={person.id}>
                        {employeeFullName(person.firstName, person.lastName)}
                      </option>
                    ))}
                  </select>
                  <select
                    name="status"
                    className="h-9 rounded-md border border-line px-2 text-sm"
                    defaultValue="ASSIGNED"
                  >
                    {TRAINING_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {TRAINING_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" size="sm" disabled={busy}>
                    Enrol
                  </Button>
                </form>
              )}
              {program.enrollments.length === 0 ? (
                <p className="text-sm text-muted">Nobody enrolled yet.</p>
              ) : (
                <ul className="divide-y divide-line rounded-md border border-line">
                  {program.enrollments.map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                    >
                      <Link
                        href={`/employees/${row.employee.id}`}
                        className="font-medium text-ink hover:underline"
                      >
                        {employeeFullName(
                          row.employee.firstName,
                          row.employee.lastName
                        )}
                      </Link>
                      <span className="text-xs text-muted">
                        {TRAINING_STATUS_LABELS[
                          row.status as keyof typeof TRAINING_STATUS_LABELS
                        ] ?? row.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
