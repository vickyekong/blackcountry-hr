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
import { PageHeader } from "@/components/layout/page-header";
import { Wallet, Layers, Gift, MinusCircle, HandCoins, Landmark, FileSpreadsheet, FlaskConical } from "lucide-react";

interface PayrollRun {
  id: string;
  periodMonth: number;
  periodYear: number;
  status: string;
  createdBy: { name: string };
  _count: { payslips: number };
}

const TABS = [
  { id: "runs", label: "Runs", icon: Wallet },
  { id: "structures", label: "Structures", icon: Layers },
  { id: "benefits", label: "Benefits", icon: Gift },
  { id: "deductions", label: "Deductions", icon: MinusCircle },
  { id: "advances", label: "Advances", icon: HandCoins },
  { id: "loans", label: "Loans", icon: Landmark },
  { id: "remittances", label: "Remittances", icon: FileSpreadsheet },
  { id: "what-if", label: "What-if", icon: FlaskConical },
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
      <PageHeader
        icon={Wallet}
        title="Payroll"
        description={`${PRODUCT_NAME} 4-step wizard uses weekly timesheets as hours. Salary structures, advances, and loans attach as extra lines — Super Admin still clears the run before Finance processes it.`}
        actions={
          tab === "runs" ? (
            <Button onClick={createRun} disabled={creating}>
              {creating ? "Creating…" : "Start payroll wizard"}
            </Button>
          ) : null
        }
      />

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
              "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition",
              tab === item.id
                ? "border-ink text-ink"
                : "border-transparent text-muted hover:text-ink"
            )}
          >
            <item.icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            {item.label}
          </button>
        ))}
      </div>

      {tab === "runs" ? (
        <>
          <PayrollExportPanel runs={runs} />
          <div className="rounded-lg border border-line bg-white">
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
                    <TableCell colSpan={4} className="text-center text-muted">
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
