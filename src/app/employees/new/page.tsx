"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewEmployeePage() {
  return (
    <AppShell>
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <NewEmployeeForm />
      </Suspense>
    </AppShell>
  );
}

function NewEmployeeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const applicationId = searchParams.get("applicationId") ?? "";
  const hireDepartment = searchParams.get("department") ?? "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>(
    []
  );

  useEffect(() => {
    fetch("/api/departments")
      .then((r) => r.json())
      .then((data) => setDepartments(Array.isArray(data) ? data : []));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const payload = {
      employeeCode: form.get("employeeCode"),
      firstName: form.get("firstName"),
      lastName: form.get("lastName"),
      sex: form.get("sex"),
      department: form.get("department"),
      jobTitle: form.get("jobTitle"),
      startDate: form.get("startDate"),
      basicSalary: Number(form.get("basicSalary")),
      housingAllowance: Number(form.get("housingAllowance") || 0),
      transportAllowance: Number(form.get("transportAllowance") || 0),
      bankName: form.get("bankName") || undefined,
      bankAccountNumber: form.get("bankAccountNumber") || undefined,
      tin: form.get("tin") || undefined,
      employmentType: form.get("employmentType") || "FULL_TIME",
      applicationId: form.get("applicationId") || undefined,
    };

    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to create employee");
      return;
    }
    router.push(`/employees/${data.id}`);
    router.refresh();
  }

  const departmentOptions = departments.some((d) => d.name === hireDepartment)
    ? departments
    : hireDepartment
      ? [{ id: "hire-dept", name: hireDepartment }, ...departments]
      : departments;

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-900">Add Employee</h1>
        {applicationId ? (
          <p className="mt-1 text-sm text-muted">
            Hiring from an application
            {searchParams.get("email")
              ? ` (${searchParams.get("email")})`
              : ""}
            . After you save, issue a Staff portal login if they are full-time.
          </p>
        ) : null}
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Employee details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {applicationId ? (
              <input type="hidden" name="applicationId" value={applicationId} />
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="employeeCode">Employee ID</Label>
                <Input id="employeeCode" name="employeeCode" required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="startDate">Start date</Label>
                <Input id="startDate" name="startDate" type="date" required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  required
                  className="mt-1"
                  defaultValue={searchParams.get("firstName") ?? ""}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  required
                  className="mt-1"
                  defaultValue={searchParams.get("lastName") ?? ""}
                />
              </div>
              <div>
                <Label htmlFor="sex">Sex</Label>
                <select
                  id="sex"
                  name="sex"
                  required
                  className="mt-1 flex h-9 w-full rounded-md border border-stone-300 px-3 text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <select
                  id="department"
                  name="department"
                  required
                  className="mt-1 flex h-9 w-full rounded-md border border-stone-300 px-3 text-sm"
                  defaultValue={hireDepartment}
                >
                  <option value="" disabled>
                    {departmentOptions.length ? "Select…" : "Add departments first"}
                  </option>
                  {departmentOptions.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="jobTitle">Job title</Label>
                <Input
                  id="jobTitle"
                  name="jobTitle"
                  required
                  className="mt-1"
                  defaultValue={searchParams.get("jobTitle") ?? ""}
                />
              </div>
              <div>
                <Label htmlFor="employmentType">Employment type</Label>
                <select
                  id="employmentType"
                  name="employmentType"
                  className="mt-1 flex h-9 w-full rounded-md border border-stone-300 px-3 text-sm"
                  defaultValue={searchParams.get("employmentType") ?? "FULL_TIME"}
                >
                  <option value="FULL_TIME">Full-time</option>
                  <option value="CONTRACT">Contract</option>
                </select>
              </div>
            </div>

            <div className="border-t border-stone-100 pt-4">
              <p className="mb-3 text-sm font-medium text-stone-700">Compensation (₦)</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="basicSalary">Basic</Label>
                  <Input id="basicSalary" name="basicSalary" type="number" required className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="housingAllowance">Housing</Label>
                  <Input id="housingAllowance" name="housingAllowance" type="number" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="transportAllowance">Transport</Label>
                  <Input id="transportAllowance" name="transportAllowance" type="number" className="mt-1" />
                </div>
              </div>
            </div>

            <div className="border-t border-stone-100 pt-4">
              <p className="mb-3 text-sm font-medium text-stone-700">Bank & tax</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="bankName">Bank name</Label>
                  <Input id="bankName" name="bankName" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="bankAccountNumber">Account number</Label>
                  <Input id="bankAccountNumber" name="bankAccountNumber" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="tin">TIN</Label>
                  <Input id="tin" name="tin" className="mt-1" />
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : "Save employee"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
