"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PeriodSelect } from "@/components/talent/period-select";
import {
  GOAL_SCOPE_LABELS,
  GOAL_SCOPES,
  reviewPeriodLabel,
  type GoalScope,
} from "@/lib/performance/labels";

type GoalRow = {
  id: string;
  title: string;
  target: string;
  actual: string;
  unit: string | null;
  weight: number;
  scope: string;
  department: string | null;
  employeeId: string | null;
  employeeName: string | null;
  periodLabel: string;
  achievementPercent: number | null;
};

type StaffOption = { id: string; name: string; department: string };

function pct(value: number | null | undefined) {
  return value == null ? "—" : `${value}%`;
}

export function PerformanceGoalsPanel({
  year,
  canManage,
}: {
  year: number;
  canManage: boolean;
}) {
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [companyPct, setCompanyPct] = useState<number | null>(null);
  const [scope, setScope] = useState<GoalScope>("INDIVIDUAL");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function load() {
    fetch(`/api/performance?year=${year}`)
      .then((r) => r.json())
      .then((data) => {
        setGoals(Array.isArray(data.goals) ? data.goals : []);
        setStaff(Array.isArray(data.staff) ? data.staff : []);
        setDepartments(Array.isArray(data.departments) ? data.departments : []);
        setCompanyPct(data.kpi?.weightedAchievement ?? null);
      })
      .catch(() => undefined);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/performance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope,
        title: form.goalTitle.value,
        target: form.goalTarget.value,
        actual: form.goalActual.value || "",
        unit: form.goalUnit.value || null,
        weight: Number(form.goalWeight.value || 100),
        periodYear: year,
        periodLabel: form.periodLabel.value,
        employeeId: form.employeeId?.value || null,
        department: form.department?.value || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? "Could not save goal");
      return;
    }
    form.reset();
    setScope("INDIVIDUAL");
    load();
  }

  async function saveActual(goalId: string, actual: string) {
    setBusy(true);
    setMessage("");
    const res = await fetch(`/api/performance/goals/${goalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actual }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error ?? "Could not update actual");
      return;
    }
    load();
  }

  const grouped = GOAL_SCOPES.map((id) => ({
    id,
    rows: goals.filter((g) => g.scope === id),
  }));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Numeric targets compute achievement automatically (620 / 500 = 124%).
        Scores do not change payroll.
        {companyPct != null ? ` Company-weighted achievement this year: ${companyPct}%.` : ""}
      </p>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Add a goal or KPI</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void add(e)} className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="scope">Scope</Label>
                <select
                  id="scope"
                  className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-sm"
                  value={scope}
                  onChange={(e) => setScope(e.target.value as GoalScope)}
                >
                  {GOAL_SCOPES.map((id) => (
                    <option key={id} value={id}>
                      {GOAL_SCOPE_LABELS[id]}
                    </option>
                  ))}
                </select>
              </div>
              {scope === "INDIVIDUAL" && (
                <div>
                  <Label htmlFor="employeeId">Staff</Label>
                  <select
                    id="employeeId"
                    name="employeeId"
                    className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-sm"
                    required
                  >
                    <option value="">Select</option>
                    {staff.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {scope === "DEPARTMENT" && (
                <div>
                  <Label htmlFor="department">Department</Label>
                  <select
                    id="department"
                    name="department"
                    className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-sm"
                    required
                  >
                    <option value="">Select</option>
                    {departments.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <Label>Period</Label>
                <PeriodSelect name="periodLabel" />
              </div>
              <div className="sm:col-span-3">
                <Label htmlFor="goalTitle">Goal / KPI</Label>
                <Input id="goalTitle" name="goalTitle" className="mt-1" required />
              </div>
              <div>
                <Label htmlFor="goalTarget">Target</Label>
                <Input
                  id="goalTarget"
                  name="goalTarget"
                  className="mt-1"
                  placeholder="500"
                  required
                />
              </div>
              <div>
                <Label htmlFor="goalActual">Actual</Label>
                <Input id="goalActual" name="goalActual" className="mt-1" placeholder="620" />
              </div>
              <div>
                <Label htmlFor="goalUnit">Unit</Label>
                <Input id="goalUnit" name="goalUnit" className="mt-1" placeholder="leads" />
              </div>
              <div>
                <Label htmlFor="goalWeight">Weight %</Label>
                <Input
                  id="goalWeight"
                  name="goalWeight"
                  type="number"
                  min={1}
                  max={100}
                  defaultValue={100}
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-3">
                <Button type="submit" disabled={busy}>
                  Add goal
                </Button>
              </div>
            </form>
            {message && <p className="mt-3 text-sm text-red-600">{message}</p>}
          </CardContent>
        </Card>
      )}

      {grouped.map((group) => (
        <Card key={group.id}>
          <CardHeader>
            <CardTitle>{GOAL_SCOPE_LABELS[group.id]} goals</CardTitle>
          </CardHeader>
          <CardContent>
            {group.rows.length === 0 ? (
              <p className="text-sm text-muted">None this year.</p>
            ) : (
              <ul className="divide-y divide-line rounded-md border border-line">
                {group.rows.map((goal) => (
                  <li
                    key={goal.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
                  >
                    <div>
                      <p className="font-medium text-ink">{goal.title}</p>
                      <p className="text-xs text-muted">
                        {reviewPeriodLabel(goal.periodLabel)}
                        {goal.employeeName ? ` · ${goal.employeeName}` : ""}
                        {goal.department ? ` · ${goal.department}` : ""}
                        {" · "}
                        target {goal.target}
                        {goal.unit ? ` ${goal.unit}` : ""}
                        {goal.actual ? ` · actual ${goal.actual}` : ""}
                        {` · weight ${goal.weight}%`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums text-xs font-medium text-ink-soft">
                        {pct(goal.achievementPercent)}
                      </span>
                      {canManage && (
                        <form
                          className="flex items-center gap-1"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const value = (
                              e.currentTarget.elements.namedItem(
                                "actual"
                              ) as HTMLInputElement
                            ).value;
                            void saveActual(goal.id, value);
                          }}
                        >
                          <Input
                            name="actual"
                            defaultValue={goal.actual}
                            className="h-8 w-24"
                            placeholder="Actual"
                          />
                          <Button type="submit" size="sm" variant="outline" disabled={busy}>
                            Save
                          </Button>
                        </form>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
