"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge, payrollStatusVariant } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PRODUCT_NAME } from "@/lib/brand";
import { PayrollExportPanel } from "@/components/exports/payroll-export-panel";
import { StructuresPanel } from "@/components/payroll/structures-panel";
import { BenefitsPanel } from "@/components/payroll/benefits-panel";
import { DeductionsPanel } from "@/components/payroll/deductions-panel";
import { AdvancesPanel } from "@/components/payroll/advances-panel";
import { LoansPanel } from "@/components/payroll/loans-panel";
import { RemittancesPanel } from "@/components/payroll/remittances-panel";
import { SimulatePanel } from "@/components/payroll/simulate-panel";
import { getMonthName } from "@/lib/utils";
import { cn } from "@/lib/cn";

interface PayrollRun {
  id: string;
  periodMonth: number;
  periodYear: number;
  status: string;
  createdBy: { name: string };
  _count: { payslips: number };
}

const TABS = [
  { id: "runs", label: "Runs" },
  { id: "structures", label: "Structures" },
  { id: "benefits", label: "Benefits" },
  { id: "deductions", label: "Deductions" },
  { id: "advances", label: "Advances" },
  { id: "loans", label: "Loans" },
  { id: "remittances", label: "Remittances" },
  { id: "what-if", label: "What-if" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function PayrollPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: TabId = TABS.some((item) => item.id === tabParam)
    ? (tabParam as TabId)
    : "runs";

  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/payroll/runs")
      .then((r) => r.json())
      .then(setRuns);
  }, []);

  async function createRun() {
    setCreating(true);
    const now = new Date();
    const res = await fetch("/api/payroll/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        periodMonth: now.getMonth() + 1,
        periodYear: now.getFullYear(),
        applyAttendancePenalties: false,
      }),
    });
    setCreating(false);
    if (res.ok) {
      const run = await res.json();
      window.location.href = `/payroll/${run.id}`;
    } else {
      const data = await res.json();
      alert(data.error ?? "Failed to create run");
    }
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Payroll</h1>
          <p className="mt-1 text-sm text-stone-500">
            {PRODUCT_NAME} 4-step wizard uses weekly timesheets as hours. Salary
            structures, advances, and loans attach as extra lines — Super Admin
            still clears the run before Finance processes it.
          </p>
        </div>
        {tab === "runs" ? (
          <Button onClick={createRun} disabled={creating}>
            {creating ? "Creating…" : "Start payroll wizard"}
          </Button>
        ) : null}
      </div>

      <div className="mb-6 flex flex-wrap gap-1 border-b border-line">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() =>
              router.push(
                item.id === "runs" ? "/payroll" : `/payroll?tab=${item.id}`
              )
            }
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition",
              tab === item.id
                ? "border-stone-900 text-stone-900"
                : "border-transparent text-stone-500 hover:text-stone-800"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "runs" ? (
        <>
          <PayrollExportPanel runs={runs} />
          <div className="rounded-lg border border-stone-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created by</TableHead>
                  <TableHead>Payslips</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>
                      <Link
                        href={`/payroll/${run.id}`}
                        className="font-medium hover:underline"
                      >
                        {getMonthName(run.periodMonth)} {run.periodYear}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={payrollStatusVariant(run.status)}>
                        {run.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{run.createdBy.name}</TableCell>
                    <TableCell>{run._count.payslips}</TableCell>
                  </TableRow>
                ))}
                {runs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-stone-500">
                      No payroll runs yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      ) : null}
      {tab === "structures" ? <StructuresPanel /> : null}
      {tab === "benefits" ? <BenefitsPanel /> : null}
      {tab === "deductions" ? <DeductionsPanel /> : null}
      {tab === "advances" ? <AdvancesPanel /> : null}
      {tab === "loans" ? <LoansPanel /> : null}
      {tab === "remittances" ? <RemittancesPanel /> : null}
      {tab === "what-if" ? <SimulatePanel /> : null}
    </AppShell>
  );
}

export default function PayrollPage() {
  return (
    <Suspense fallback={<p className="p-8 text-muted">Loading…</p>}>
      <PayrollPageInner />
    </Suspense>
  );
}
