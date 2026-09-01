"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { getMonthName } from "@/lib/utils";

interface PayrollRun {
  id: string;
  periodMonth: number;
  periodYear: number;
  status: string;
  createdBy: { name: string };
  _count: { payslips: number };
}

export default function FinanceHomePage() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/payroll/runs")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRuns(data);
        else setError(data.error ?? "Could not load payroll");
      })
      .catch(() => setError("Could not load payroll"));
  }, []);

  const queue = runs.filter((r) =>
    ["FORWARDED_TO_FINANCE", "PROCESSING", "PAID"].includes(r.status)
  );

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink">Finance</h1>
        <p className="mt-1 text-sm text-muted">
          Process payroll after Super Admin approval and HR forward. You do not
          hire people or create logins.
        </p>
      </div>
      {error && <p className="mb-4 text-sm text-signal">{error}</p>}
      <div className="rounded-lg border border-line bg-foam">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>From HR</TableHead>
              <TableHead>Payslips</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queue.map((run) => (
              <TableRow key={run.id}>
                <TableCell>
                  <Link
                    href={`/finance/${run.id}`}
                    className="font-medium hover:underline"
                  >
                    {getMonthName(run.periodMonth)} {run.periodYear}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={payrollStatusVariant(run.status)}>
                    {run.status.replace(/_/g, " ")}
                  </Badge>
                </TableCell>
                <TableCell>{run.createdBy.name}</TableCell>
                <TableCell>{run._count.payslips}</TableCell>
              </TableRow>
            ))}
            {queue.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted">
                  Nothing forwarded from HR yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
