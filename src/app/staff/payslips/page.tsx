"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, getMonthName } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Banknote } from "lucide-react";

interface PayslipRow {
  id: string;
  netPayKobo: string;
  grossPayKobo: string;
  payeKobo: string;
  payrollRun: {
    periodMonth: number;
    periodYear: number;
    status: string;
  };
}

export default function StaffPayslipsPage() {
  const [payslips, setPayslips] = useState<PayslipRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/payslips/mine")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPayslips(data);
        else setError(data.error ?? "Could not load payslips");
      });
  }, []);

  return (
    <AppShell>
      <PageHeader
        icon={Banknote}
        title="Payslips"
        description="Your approved payslips only. Download the PDF after Super Admin has signed off the run."
      />

      {error && <p className="mb-4 text-sm text-signal">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-line/80 bg-foam/95">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Gross</TableHead>
              <TableHead>PAYE</TableHead>
              <TableHead>Net</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payslips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted">
                  No approved payslips yet.
                </TableCell>
              </TableRow>
            ) : (
              payslips.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {getMonthName(p.payrollRun.periodMonth)} {p.payrollRun.periodYear}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatCurrency(p.grossPayKobo)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatCurrency(p.payeKobo)}
                  </TableCell>
                  <TableCell className="tabular-nums font-medium">
                    {formatCurrency(p.netPayKobo)}
                  </TableCell>
                  <TableCell>
                    <Button asChild size="sm" variant="outline">
                      <a href={`/api/payslips/${p.id}/pdf`} target="_blank" rel="noreferrer">
                        PDF
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
