"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

type Totals = {
  grossPayKobo: string;
  netPayKobo: string;
  payeKobo: string;
  pensionEmployeeKobo: string;
  pensionEmployerKobo: string;
  employerCostKobo: string;
};

type Result = {
  employeeCount: number;
  extraHires: number;
  baseline: Totals;
  scenario: Totals;
  variance: Totals;
};

function Row({
  label,
  baseline,
  scenario,
  variance,
}: {
  label: string;
  baseline: string;
  scenario: string;
  variance: string;
}) {
  const n = Number(variance);
  return (
    <div className="grid grid-cols-4 gap-2 py-2 text-sm">
      <span className="text-muted">{label}</span>
      <span className="tabular-nums">{formatCurrency(baseline)}</span>
      <span className="tabular-nums">{formatCurrency(scenario)}</span>
      <span
        className={`tabular-nums ${
          n > 0 ? "text-ink" : n < 0 ? "text-emerald-800" : "text-muted"
        }`}
      >
        {n > 0 ? "+" : ""}
        {formatCurrency(variance)}
      </span>
    </div>
  );
}

export function SimulatePanel() {
  const [result, setResult] = useState<Result | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const data = new FormData(e.currentTarget);
    const res = await fetch("/api/payroll/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        salaryIncreaseBps: Math.round(
          Number(data.get("salaryIncreasePct") || 0) * 100
        ),
        transportIncreaseNaira: Number(data.get("transportIncreaseNaira") || 0),
        extraHires: Number(data.get("extraHires") || 0),
        extraHireMonthlyGrossNaira: Number(
          data.get("extraHireMonthlyGrossNaira") || 0
        ),
        overtimeIncreaseBps: Math.round(
          Number(data.get("overtimeIncreasePct") || 0) * 100
        ),
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(json.error ?? "Simulation failed");
      return;
    }
    setResult(json);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>What-if</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted">
          Runs the existing PAYE engine on current active staff without writing
          a payroll run. Use this to see gross, net, tax, and pension impact
          before HR starts a draft.
        </p>
        <form onSubmit={run} className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label htmlFor="salaryIncreasePct">Salary increase (%)</Label>
            <Input
              id="salaryIncreasePct"
              name="salaryIncreasePct"
              type="number"
              min={0}
              step={0.5}
              defaultValue={0}
            />
          </div>
          <div>
            <Label htmlFor="transportIncreaseNaira">Transport + (₦)</Label>
            <Input
              id="transportIncreaseNaira"
              name="transportIncreaseNaira"
              type="number"
              min={0}
              defaultValue={0}
            />
          </div>
          <div>
            <Label htmlFor="overtimeIncreasePct">Overtime increase (%)</Label>
            <Input
              id="overtimeIncreasePct"
              name="overtimeIncreasePct"
              type="number"
              min={0}
              step={1}
              defaultValue={0}
            />
          </div>
          <div>
            <Label htmlFor="extraHires">Extra hires</Label>
            <Input
              id="extraHires"
              name="extraHires"
              type="number"
              min={0}
              defaultValue={0}
            />
          </div>
          <div>
            <Label htmlFor="extraHireMonthlyGrossNaira">
              New hire monthly gross (₦)
            </Label>
            <Input
              id="extraHireMonthlyGrossNaira"
              name="extraHireMonthlyGrossNaira"
              type="number"
              min={0}
              defaultValue={0}
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={busy}>
              {busy ? "Calculating…" : "Simulate"}
            </Button>
          </div>
        </form>
        {message ? <p className="mb-3 text-sm text-red-700">{message}</p> : null}
        {result ? (
          <div>
            <p className="mb-2 text-sm text-muted">
              {result.employeeCount} active staff
              {result.extraHires
                ? ` plus ${result.extraHires} modelled hire${
                    result.extraHires === 1 ? "" : "s"
                  }`
                : ""}
            </p>
            <div className="grid grid-cols-4 gap-2 border-b border-line py-2 text-xs font-medium uppercase tracking-wide text-muted">
              <span>Line</span>
              <span>Now</span>
              <span>Scenario</span>
              <span>Variance</span>
            </div>
            <Row
              label="Gross"
              baseline={result.baseline.grossPayKobo}
              scenario={result.scenario.grossPayKobo}
              variance={result.variance.grossPayKobo}
            />
            <Row
              label="Net"
              baseline={result.baseline.netPayKobo}
              scenario={result.scenario.netPayKobo}
              variance={result.variance.netPayKobo}
            />
            <Row
              label="PAYE"
              baseline={result.baseline.payeKobo}
              scenario={result.scenario.payeKobo}
              variance={result.variance.payeKobo}
            />
            <Row
              label="Pension (staff)"
              baseline={result.baseline.pensionEmployeeKobo}
              scenario={result.scenario.pensionEmployeeKobo}
              variance={result.variance.pensionEmployeeKobo}
            />
            <Row
              label="Pension (employer)"
              baseline={result.baseline.pensionEmployerKobo}
              scenario={result.scenario.pensionEmployerKobo}
              variance={result.variance.pensionEmployerKobo}
            />
            <Row
              label="Employer cost"
              baseline={result.baseline.employerCostKobo}
              scenario={result.scenario.employerCostKobo}
              variance={result.variance.employerCostKobo}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
