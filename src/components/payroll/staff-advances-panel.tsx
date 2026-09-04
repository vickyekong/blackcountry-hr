"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { moneyRequestStatusLabel } from "@/lib/payroll/labels";

type Row = {
  id: string;
  requestedKobo: string;
  remainingKobo: string;
  installments: number;
  reason: string | null;
  status: string;
};

export function StaffAdvancesPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/staff/advances")
      .then((r) => r.json())
      .then((data) => setRows(Array.isArray(data) ? data : []));
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setMessage("");
    const data = new FormData(form);
    const res = await fetch("/api/staff/advances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountNaira: Number(data.get("amountNaira") || 0),
        installments: Number(data.get("installments") || 1),
        reason: data.get("reason") || undefined,
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(json.error ?? "Could not submit request");
      return;
    }
    form.reset();
    load();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Salary advance</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted">
          HR reviews the request. If approved, repayment comes off draft
          payroll in equal monthly amounts.
        </p>
        <form onSubmit={add} className="mb-6 grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="amountNaira">Amount (₦)</Label>
            <Input id="amountNaira" name="amountNaira" type="number" min={1} required />
          </div>
          <div>
            <Label htmlFor="installments">Months</Label>
            <Input
              id="installments"
              name="installments"
              type="number"
              min={1}
              max={12}
              defaultValue={3}
              required
            />
          </div>
          <div>
            <Label htmlFor="reason">Reason</Label>
            <Input id="reason" name="reason" placeholder="Optional" />
          </div>
          <div>
            <Button type="submit" disabled={busy}>
              Request advance
            </Button>
          </div>
        </form>
        {message ? <p className="mb-3 text-sm text-red-700">{message}</p> : null}
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No advance requests yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">
                    {formatCurrency(row.requestedKobo)} over {row.installments}{" "}
                    month{row.installments === 1 ? "" : "s"}
                  </p>
                  <p className="text-sm text-muted">
                    Remaining {formatCurrency(row.remainingKobo)}
                    {row.reason ? ` · ${row.reason}` : ""}
                  </p>
                </div>
                <Badge>{moneyRequestStatusLabel(row.status)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
