"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/utils";
import { EMPLOYEE_SEX_OPTIONS } from "@/lib/employees/status";

interface StaffProfile {
  employeeCode: string;
  firstName: string;
  lastName: string;
  department: string;
  jobTitle: string;
  status: string;
  sex: string | null;
  startDate: string;
  workEmail: string | null;
  phone: string | null;
  addressLine: string | null;
  nextOfKinName: string | null;
  nextOfKinPhone: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  tin: string | null;
  rsaPin: string | null;
  nhfNumber: string | null;
  annualRentNaira: number;
  compensation: {
    basicSalaryKobo: string;
    housingAllowanceKobo: string;
    transportAllowanceKobo: string;
  };
  locked: {
    bankName: boolean;
    bankAccountNumber: boolean;
    tin: boolean;
    rsaPin: boolean;
    nhfNumber: boolean;
    annualRent: boolean;
  };
  completeness: { percent: number; missing: string[] };
}

export default function StaffProfilePage() {
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/staff/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setProfile(data);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError("");
    setMessage("");
    const form = new FormData(e.currentTarget);
    const payload = {
      phone: String(form.get("phone") || ""),
      addressLine: String(form.get("addressLine") || ""),
      nextOfKinName: String(form.get("nextOfKinName") || ""),
      nextOfKinPhone: String(form.get("nextOfKinPhone") || ""),
      sex: String(form.get("sex") || "") || undefined,
      bankName: profile.locked.bankName
        ? undefined
        : String(form.get("bankName") || ""),
      bankAccountNumber: profile.locked.bankAccountNumber
        ? undefined
        : String(form.get("bankAccountNumber") || ""),
      tin: profile.locked.tin ? undefined : String(form.get("tin") || ""),
      rsaPin: profile.locked.rsaPin ? undefined : String(form.get("rsaPin") || ""),
      nhfNumber: profile.locked.nhfNumber
        ? undefined
        : String(form.get("nhfNumber") || ""),
      annualRent: profile.locked.annualRent
        ? undefined
        : Number(form.get("annualRent") || 0),
    };

    const res = await fetch("/api/staff/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Could not save");
      return;
    }
    setProfile(data);
    setMessage("Details saved");
  }

  if (!profile) {
    return (
      <AppShell>
        <p className="text-sm text-muted">{error || "Loading your details…"}</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-ink">My details</h1>
        <p className="mt-1 text-sm text-muted">
          Fill in what HR still needs. Job title and pay are read-only. Bank and tax
          already on file need a request so Super Admin can clear the change.
        </p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Role at the company</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              ["Staff code", profile.employeeCode],
              ["Name", `${profile.firstName} ${profile.lastName}`],
              ["Job", profile.jobTitle],
              ["Department", profile.department],
              ["Started", formatDate(profile.startDate)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <span className="text-muted">{label}</span>
                <span className="text-right font-medium text-ink">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Monthly pay (read-only)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              ["Basic", profile.compensation.basicSalaryKobo],
              ["Housing", profile.compensation.housingAllowanceKobo],
              ["Transport", profile.compensation.transportAllowanceKobo],
            ].map(([label, amount]) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted">{label}</span>
                <span className="tabular-nums font-medium">
                  {formatCurrency(amount)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>
            Personal &amp; statutory · {profile.completeness.percent}% complete
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="sex">Sex</Label>
              <select
                id="sex"
                name="sex"
                defaultValue={profile.sex ?? ""}
                className="mt-1 flex h-9 w-full rounded-lg border border-line bg-foam px-3 text-sm"
              >
                <option value="">Select</option>
                {EMPLOYEE_SEX_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={profile.phone ?? ""}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="workEmail">Work email</Label>
                <Input
                  id="workEmail"
                  value={profile.workEmail ?? ""}
                  disabled
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="addressLine">Home address</Label>
              <Input
                id="addressLine"
                name="addressLine"
                defaultValue={profile.addressLine ?? ""}
                className="mt-1"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="nextOfKinName">Next of kin</Label>
                <Input
                  id="nextOfKinName"
                  name="nextOfKinName"
                  defaultValue={profile.nextOfKinName ?? ""}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="nextOfKinPhone">Next of kin phone</Label>
                <Input
                  id="nextOfKinPhone"
                  name="nextOfKinPhone"
                  defaultValue={profile.nextOfKinPhone ?? ""}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="bankName">Bank name</Label>
                <Input
                  id="bankName"
                  name="bankName"
                  defaultValue={profile.bankName ?? ""}
                  disabled={profile.locked.bankName}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="bankAccountNumber">Account number</Label>
                <Input
                  id="bankAccountNumber"
                  name="bankAccountNumber"
                  defaultValue={profile.bankAccountNumber ?? ""}
                  disabled={profile.locked.bankAccountNumber}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="tin">TIN</Label>
                <Input
                  id="tin"
                  name="tin"
                  defaultValue={profile.tin ?? ""}
                  disabled={profile.locked.tin}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="rsaPin">RSA PIN</Label>
                <Input
                  id="rsaPin"
                  name="rsaPin"
                  defaultValue={profile.rsaPin ?? ""}
                  disabled={profile.locked.rsaPin}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="nhfNumber">NHF number</Label>
                <Input
                  id="nhfNumber"
                  name="nhfNumber"
                  defaultValue={profile.nhfNumber ?? ""}
                  disabled={profile.locked.nhfNumber}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="annualRent">Annual rent (₦)</Label>
                <Input
                  id="annualRent"
                  name="annualRent"
                  type="number"
                  min={0}
                  defaultValue={profile.annualRentNaira || ""}
                  disabled={profile.locked.annualRent}
                  className="mt-1"
                />
              </div>
            </div>
            {Object.values(profile.locked).some(Boolean) && (
              <p className="text-xs text-muted">
                Locked fields already on file. Request a change from Requests if they
                need updating.
              </p>
            )}
            {error && <p className="text-sm text-signal">{error}</p>}
            {message && <p className="text-sm text-ok">{message}</p>}
            <Button type="submit" variant="brand" disabled={saving}>
              {saving ? "Saving…" : "Save details"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AppShell>
  );
}
