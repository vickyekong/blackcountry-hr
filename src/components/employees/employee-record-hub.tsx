"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, employeeFullName } from "@/lib/utils";
import { cn } from "@/lib/cn";
import { EmployeeDocumentsPanel } from "@/components/employees/employee-documents-panel";
import { EmployeeSkillsPanel } from "@/components/employees/employee-skills-panel";
import { EmployeeCertificationsPanel } from "@/components/employees/employee-certs-panel";
import { EmployeeAssetsPanel } from "@/components/employees/employee-assets-panel";
import { EmployeeLifecyclePanel } from "@/components/employees/lifecycle-panel";
import { EmployeeTrainingPanel } from "@/components/employees/employee-training-panel";
import { EmployeePerformancePanel } from "@/components/employees/employee-performance-panel";
import { EmployeePayPanel } from "@/components/employees/employee-pay-panel";

type TabId =
  | "overview"
  | "documents"
  | "skills"
  | "certs"
  | "assets"
  | "training"
  | "performance"
  | "pay"
  | "onboarding";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "documents", label: "Documents" },
  { id: "skills", label: "Skills" },
  { id: "certs", label: "Certifications" },
  { id: "assets", label: "Assets" },
  { id: "training", label: "Training" },
  { id: "performance", label: "Performance" },
  { id: "pay", label: "Pay extras" },
  { id: "onboarding", label: "Onboarding" },
];

export type EmployeeHubRecord = {
  id: string;
  firstName: string;
  lastName: string;
  department: string;
  jobTitle: string;
  employmentType: string;
  status: string;
  sex: string | null;
  startDate: string;
  endDate: string | null;
  dateOfBirth: string | null;
  probationEnd: string | null;
  workLocation: string | null;
  phone: string | null;
  workEmail: string | null;
  addressLine: string | null;
  nextOfKinName: string | null;
  nextOfKinPhone: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  tin: string | null;
  rsaPin: string | null;
  nhfNumber: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  basicSalaryKobo: string | number;
  housingAllowanceKobo: string | number;
  transportAllowanceKobo: string | number;
  otherTaxableAllowancesKobo: string | number;
  manager: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    jobTitle: string;
  } | null;
  leaveBalances: Array<{
    id: string;
    leaveType: string;
    entitledDays: number;
    usedDays: number;
  }>;
};

function money(value: string | number) {
  return formatCurrency(typeof value === "number" ? BigInt(value) : BigInt(value));
}

export function EmployeeRecordHub({
  employee,
  canManage,
}: {
  employee: EmployeeHubRecord;
  canManage: boolean;
}) {
  const [tab, setTab] = useState<TabId>("overview");
  const gross =
    BigInt(employee.basicSalaryKobo) +
    BigInt(employee.housingAllowanceKobo) +
    BigInt(employee.transportAllowanceKobo) +
    BigInt(employee.otherTaxableAllowancesKobo);

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-1 border-b border-stone-200">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              tab === item.id
                ? "border-stone-900 text-stone-900"
                : "border-transparent text-stone-500 hover:text-stone-800"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Personal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row
                label="Date of birth"
                value={
                  employee.dateOfBirth ? formatDate(employee.dateOfBirth) : "—"
                }
              />
              <Row label="Phone" value={employee.phone ?? "—"} />
              <Row label="Work email" value={employee.workEmail ?? "—"} />
              <Row label="Address" value={employee.addressLine ?? "—"} />
              <Row
                label="Next of kin"
                value={
                  employee.nextOfKinName
                    ? `${employee.nextOfKinName}${
                        employee.nextOfKinPhone
                          ? ` · ${employee.nextOfKinPhone}`
                          : ""
                      }`
                    : "—"
                }
              />
              <Row
                label="Emergency contact"
                value={
                  employee.emergencyContactName
                    ? `${employee.emergencyContactName}${
                        employee.emergencyContactPhone
                          ? ` · ${employee.emergencyContactPhone}`
                          : ""
                      }`
                    : "—"
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Employment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Department" value={employee.department} />
              <Row label="Position" value={employee.jobTitle} />
              <Row
                label="Line manager"
                value={
                  employee.manager ? (
                    <Link
                      href={`/employees/${employee.manager.id}`}
                      className="font-medium text-stone-900 hover:underline"
                    >
                      {employeeFullName(
                        employee.manager.firstName,
                        employee.manager.lastName
                      )}
                    </Link>
                  ) : (
                    "—"
                  )
                }
              />
              <Row
                label="Employment type"
                value={
                  employee.employmentType === "CONTRACT"
                    ? "Contract"
                    : "Full-time"
                }
              />
              <Row label="Start date" value={formatDate(employee.startDate)} />
              <Row
                label="Probation ends"
                value={
                  employee.probationEnd
                    ? formatDate(employee.probationEnd)
                    : "—"
                }
              />
              <Row
                label="Contract / end date"
                value={employee.endDate ? formatDate(employee.endDate) : "—"}
              />
              <Row label="Work location" value={employee.workLocation ?? "—"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Compensation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                ["Basic salary", employee.basicSalaryKobo],
                ["Housing allowance", employee.housingAllowanceKobo],
                ["Transport allowance", employee.transportAllowanceKobo],
                ["Other taxable", employee.otherTaxableAllowancesKobo],
              ].map(([label, amount]) => (
                <div key={label as string} className="flex justify-between">
                  <span className="text-stone-500">{label}</span>
                  <span className="tabular-nums font-medium">
                    {money(amount as string | number)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between border-t border-stone-100 pt-2 font-medium">
                <span>Monthly gross</span>
                <span className="tabular-nums">{formatCurrency(gross)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statutory &amp; bank</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="TIN" value={employee.tin ?? "—"} />
              <Row label="RSA PIN" value={employee.rsaPin ?? "—"} />
              <Row label="NHF number" value={employee.nhfNumber ?? "—"} />
              <Row
                label="Bank"
                value={
                  employee.bankName
                    ? `${employee.bankName} · ${employee.bankAccountNumber}`
                    : "—"
                }
              />
            </CardContent>
          </Card>

          {employee.leaveBalances.length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Leave balances ({new Date().getFullYear()})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3">
                  {employee.leaveBalances.map((b) => (
                    <div
                      key={b.id}
                      className="rounded-md border border-stone-100 px-4 py-3 text-sm"
                    >
                      <p className="text-stone-500">
                        {b.leaveType.replace("_", " ")}
                      </p>
                      <p className="mt-1 font-medium tabular-nums">
                        {b.entitledDays - b.usedDays} / {b.entitledDays} days left
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {tab === "documents" && (
        <EmployeeDocumentsPanel
          employeeId={employee.id}
          canManage={canManage}
        />
      )}
      {tab === "skills" && (
        <EmployeeSkillsPanel employeeId={employee.id} canManage={canManage} />
      )}
      {tab === "certs" && (
        <EmployeeCertificationsPanel
          employeeId={employee.id}
          canManage={canManage}
        />
      )}
      {tab === "assets" && <EmployeeAssetsPanel employeeId={employee.id} />}
      {tab === "training" && (
        <EmployeeTrainingPanel employeeId={employee.id} />
      )}
      {tab === "performance" && (
        <EmployeePerformancePanel
          employeeId={employee.id}
          canManage={canManage}
        />
      )}
      {tab === "pay" && <EmployeePayPanel employeeId={employee.id} />}
      {tab === "onboarding" && (
        <div>
          <h2 className="mb-1 text-lg font-semibold text-stone-900">
            Onboarding &amp; offboarding
          </h2>
          <p className="mb-3 text-sm text-stone-500">
            HR checklists for this staff member — start, track, and complete
            tasks on their behalf
          </p>
          <EmployeeLifecyclePanel employeeId={employee.id} />
        </div>
      )}
    </>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-stone-500">{label}</span>
      <span className="text-right text-stone-900">{value}</span>
    </div>
  );
}
