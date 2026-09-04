"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCurrency,
} from "@/components/ui/table";
import { formatCurrency, getMonthName } from "@/lib/utils";
import { ReportStat } from "@/components/reports/report-stat";

type CostsPayload = {
  payroll: {
    grossPayKobo: string;
    netPayKobo: string;
    payeKobo: string;
    pensionEmployeeKobo: string;
    pensionEmployerKobo: string;
    nhfKobo: string;
    nsitfKobo: string;
    employerCostKobo: string;
    headcount: number;
    runCount: number;
  };
  overtimePayrollKobo: string;
  overtimeRequestKobo: string;
  benefitsMonthlyKobo: string;
  expenseKobo: string;
  trend: Array<{
    month: number;
    year: number;
    grossPayKobo: string;
    netPayKobo: string;
    employerCostKobo: string;
    payeKobo: string;
    headcount: number;
  }>;
  byDepartment: Array<{
    department: string;
    payrollEmployerKobo: string;
    expenseKobo: string;
    timesheetHours: number;
  }>;
};

function money(value: string) {
  return formatCurrency(BigInt(value || "0"));
}

export function CostAnalyticsPanel({ year }: { year: number }) {
  const [costs, setCosts] = useState<CostsPayload | null>(null);

  useEffect(() => {
    fetch(`/api/reports/analytics?year=${year}`)
      .then((r) => r.json())
      .then((data) => setCosts(data.costs ?? null))
      .catch(() => setCosts(null));
  }, [year]);

  if (!costs) {
    return <p className="text-sm text-muted">Loading cost analytics…</p>;
  }

  const chart = costs.trend.map((row) => ({
    name: getMonthName(row.month).slice(0, 3),
    gross: Number(row.grossPayKobo) / 100,
    net: Number(row.netPayKobo) / 100,
    employer: Number(row.employerCostKobo) / 100,
  }));

  const nairaTick = (v: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(v);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          Payroll employer cost is gross plus employer pension and NSITF — the
          same basis as the payroll summary. Overtime is already inside payroll;
          expenses and benefit run-rate sit beside it, not in the general
          ledger.
        </p>
        <Button variant="outline" size="sm" asChild>
          <a
            href={`/api/reports/analytics/export?year=${year}&kind=payroll`}
            download
          >
            Export CSV
          </a>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReportStat
          label="Payroll employer cost"
          value={money(costs.payroll.employerCostKobo)}
        />
        <ReportStat label="PAYE / taxes" value={money(costs.payroll.payeKobo)} />
        <ReportStat
          label="Benefits (monthly run-rate)"
          value={money(costs.benefitsMonthlyKobo)}
        />
        <ReportStat label="Expenses reimbursed" value={money(costs.expenseKobo)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <ReportStat
          label="Pension (employer)"
          value={money(costs.payroll.pensionEmployerKobo)}
        />
        <ReportStat
          label="Overtime on payslips"
          value={money(costs.overtimePayrollKobo)}
        />
        <ReportStat
          label="Payroll runs included"
          value={String(costs.payroll.runCount)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payroll trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => nairaTick(Number(v))} width={88} />
              <Tooltip formatter={(v) => nairaTick(Number(v))} />
              <Legend />
              <Bar dataKey="gross" name="Gross" fill="#44403c" radius={[4, 4, 0, 0]} />
              <Bar dataKey="net" name="Net" fill="#a8a29e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="employer" name="Employer cost" fill="#0f766e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Department cost</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Payroll employer</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Timesheet hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costs.byDepartment.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted">
                    No approved payroll or reimbursed expenses in {year}.
                  </TableCell>
                </TableRow>
              ) : (
                costs.byDepartment.map((row) => (
                  <TableRow key={row.department}>
                    <TableCell>{row.department}</TableCell>
                    <TableCell className="text-right">
                      <TableCurrency value={row.payrollEmployerKobo} />
                    </TableCell>
                    <TableCell className="text-right">
                      <TableCurrency value={row.expenseKobo} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.timesheetHours}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
