"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { overtimeStatusLabel } from "@/lib/time/labels";

type OvertimeRow = {
  id: string;
  workDate: string;
  minutes: number;
  reason: string | null;
  status: string;
  amountKobo: string | number | null;
};

export function StaffOvertimePanel() {
  const [rows, setRows] = useState<OvertimeRow[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/staff/overtime")
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
    const hours = Number(data.get("hours") || 0);
    const res = await fetch("/api/staff/overtime", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workDate: data.get("workDate"),
        minutes: Math.round(hours * 60),
        reason: data.get("reason") || undefined,
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(json.error ?? "Could not submit overtime");
      return;
    }
    form.reset();
    load();
  }

  async function cancel(id: string) {
    setBusy(true);
    await fetch(`/api/staff/overtime/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    setBusy(false);
    load();
  }

  return (
    <>
      <p className="mb-4 text-sm text-muted">
        Request extra hours for HR to approve. This does not replace your
        weekly timesheet — validated hours still drive payroll.
      </p>
      <Card className="mb-6 max-w-lg">
        <CardHeader>
          <CardTitle>Request overtime</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} className="space-y-3">
            <div>
              <Label htmlFor="workDate">Date</Label>
              <Input id="workDate" name="workDate" type="date" required />
            </div>
            <div>
              <Label htmlFor="hours">Hours</Label>
              <Input
                id="hours"
                name="hours"
                type="number"
                min={0.25}
                step={0.25}
                required
              />
            </div>
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Input id="reason" name="reason" />
            </div>
            {message ? <p className="text-sm text-red-700">{message}</p> : null}
            <Button type="submit" disabled={busy}>
              Submit
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Your requests</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted">No overtime requests yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-ink">
                      {formatDate(row.workDate)} · {(row.minutes / 60).toFixed(2)} h
                    </p>
                    <p className="text-muted">
                      {row.amountKobo
                        ? formatCurrency(Number(row.amountKobo))
                        : "Quoted on approval"}
                      {row.reason ? ` · ${row.reason}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{overtimeStatusLabel(row.status)}</Badge>
                    {row.status === "PENDING" ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={() => cancel(row.id)}
                      >
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
