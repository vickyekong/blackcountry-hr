"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge, payrollStatusVariant } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, getMonthName } from "@/lib/utils";

interface FinanceRun {
  id: string;
  periodMonth: number;
  periodYear: number;
  status: string;
  payslips: Array<{
    id: string;
    netPayKobo: string;
    employee: { firstName: string; lastName: string; employeeCode: string };
  }>;
}

export default function FinanceRunPage() {
  const params = useParams();
  const [run, setRun] = useState<FinanceRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetch(`/api/payroll/runs/${params.id}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Not found");
        setRun(data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed"));
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(action: "start_processing" | "complete_processing") {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/payroll/runs/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Action failed");
      return;
    }
    load();
  }

  if (error && !run) {
    return (
      <AppShell>
        <p className="text-sm text-signal">{error}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/finance">Back</Link>
        </Button>
      </AppShell>
    );
  }

  if (!run) {
    return (
      <AppShell>
        <p className="text-sm text-muted">Loading…</p>
      </AppShell>
    );
  }

  const net = run.payslips.reduce(
    (sum, p) => sum + BigInt(p.netPayKobo ?? "0"),
    0n
  );

  return (
    <AppShell>
      <p className="text-sm text-muted">
        <Link href="/finance" className="hover:underline">
          Finance
        </Link>
      </p>
      <div className="mb-6 mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">
            {getMonthName(run.periodMonth)} {run.periodYear}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {run.payslips.length} payslips · net {formatCurrency(net)}
          </p>
        </div>
        <Badge variant={payrollStatusVariant(run.status)}>
          {run.status.replace(/_/g, " ")}
        </Badge>
      </div>
      {error && <p className="mb-4 text-sm text-signal">{error}</p>}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Process this run</CardTitle>
          <p className="text-sm text-muted">
            Start processing, then mark complete so HR is notified that payment
            is done.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {run.status === "FORWARDED_TO_FINANCE" && (
            <Button
              variant="brand"
              disabled={loading}
              onClick={() => void act("start_processing")}
            >
              Start processing
            </Button>
          )}
          {run.status === "PROCESSING" && (
            <Button
              variant="brand"
              disabled={loading}
              onClick={() => void act("complete_processing")}
            >
              Mark processing complete
            </Button>
          )}
          {run.status === "PAID" && (
            <p className="text-sm text-ok">Processing complete. HR was notified.</p>
          )}
        </CardContent>
      </Card>

      <ul className="space-y-2 text-sm">
        {run.payslips.map((p) => (
          <li
            key={p.id}
            className="flex justify-between rounded-lg border border-line bg-foam px-3 py-2"
          >
            <span>
              {p.employee.firstName} {p.employee.lastName}{" "}
              <span className="text-muted">({p.employee.employeeCode})</span>
            </span>
            <span className="tabular-nums">
              {formatCurrency(BigInt(p.netPayKobo))}
            </span>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
