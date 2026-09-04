"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { remittanceKindLabel } from "@/lib/payroll/labels";

type Payment = {
  id: string;
  kind: string;
  amountKobo: string;
  status: string;
  reference: string | null;
};

type RunRow = {
  id: string;
  periodLabel: string;
  status: string;
  payslipCount: number;
  payments: Payment[];
};

export function RemittancesPanel() {
  const [rows, setRows] = useState<RunRow[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/remittances")
      .then((r) => r.json())
      .then((data) => setRows(Array.isArray(data) ? data : []));
  }

  useEffect(() => {
    load();
  }, []);

  async function mark(runId: string, kind: string, action: "paid" | "pending") {
    setBusy(true);
    setMessage("");
    const reference =
      action === "paid"
        ? window.prompt("Payment reference (optional)") ?? undefined
        : undefined;
    const res = await fetch(`/api/payroll/runs/${runId}/remittances`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, action, reference }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(json.error ?? "Could not update remittance");
      return;
    }
    load();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Remittances</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted">
          PAYE, pension, NHF, and NSITF totals come from approved payroll
          payslips. Mark a line paid when the statutory payment has gone out —
          this does not change the payroll engine.
        </p>
        {message ? <p className="mb-3 text-sm text-red-700">{message}</p> : null}
        {rows.length === 0 ? (
          <p className="text-sm text-muted">
            Approve a payroll run to see remittance schedules.
          </p>
        ) : (
          <ul className="space-y-6">
            {rows.map((run) => (
              <li key={run.id} className="rounded-lg border border-line p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <p className="font-medium text-ink">{run.periodLabel}</p>
                  <Badge>{run.status.replaceAll("_", " ")}</Badge>
                  <span className="text-sm text-muted">
                    {run.payslipCount} payslips
                  </span>
                </div>
                <ul className="divide-y divide-line">
                  {run.payments.map((payment) => (
                    <li
                      key={payment.id}
                      className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {remittanceKindLabel(payment.kind)}
                        </p>
                        <p className="text-sm text-muted">
                          {formatCurrency(payment.amountKobo)}
                          {payment.reference ? ` · ${payment.reference}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge>
                          {payment.status === "PAID" ? "Paid" : "Pending"}
                        </Badge>
                        {payment.status === "PAID" ? (
                          <Button
                            type="button"
                            variant="outline"
                            disabled={busy}
                            onClick={() => mark(run.id, payment.kind, "pending")}
                          >
                            Reopen
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            disabled={busy}
                            onClick={() => mark(run.id, payment.kind, "paid")}
                          >
                            Mark paid
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
