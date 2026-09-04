"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PeriodSelect } from "@/components/talent/period-select";
import {
  GOAL_SCOPE_LABELS,
  recognitionKindLabel,
  reviewPeriodLabel,
  type GoalScope,
  type ReviewPeriod,
} from "@/lib/performance/labels";

type Goal = {
  id: string;
  title: string;
  target: string;
  actual: string;
  unit: string | null;
  scope: string;
  employeeId: string | null;
  periodLabel: string;
  achievementPercent: number | null;
};

type Review = {
  periodLabel: string;
  status: string;
  selfNotes: string | null;
  selfScore: number | null;
  managerScore: number | null;
  peerScore: number | null;
  finalScore: number | null;
  managerNotes: string | null;
  peerNotes: string | null;
  finalNotes: string | null;
};

type RecognitionRow = {
  id: string;
  kind: string;
  note: string;
  createdAt: string;
  givenByName: string;
};

function pct(value: number | null | undefined) {
  return value == null ? "—" : `${value}%`;
}

function score(value: number | null | undefined) {
  return value == null ? "—" : `${value}/5`;
}

export function StaffPerformancePanel() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [periodLabel, setPeriodLabel] = useState<ReviewPeriod>("ANNUAL");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [recognitions, setRecognitions] = useState<RecognitionRow[]>([]);
  const [kpi, setKpi] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    fetch(`/api/staff/performance?year=${year}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setMessage(data.error);
          return;
        }
        setGoals(Array.isArray(data.goals) ? data.goals : []);
        setReviews(Array.isArray(data.reviews) ? data.reviews : []);
        setRecognitions(Array.isArray(data.recognitions) ? data.recognitions : []);
        setKpi(data.kpi?.weightedAchievement ?? null);
      })
      .catch(() => setMessage("Could not load performance"));
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  const current = reviews.find((row) => row.periodLabel === periodLabel);

  async function addGoal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/staff/performance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.goalTitle.value,
        target: form.goalTarget.value,
        actual: form.goalActual.value || "",
        periodYear: year,
        periodLabel,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? "Could not save goal");
      return;
    }
    form.reset();
    load();
  }

  async function saveSelf(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/staff/performance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "review",
        periodYear: year,
        periodLabel,
        selfNotes: form.selfNotes.value || null,
        selfScore: form.selfScore.value ? Number(form.selfScore.value) : null,
        status: "SUBMITTED",
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? "Could not save self-assessment");
      return;
    }
    load();
  }

  async function saveActual(goalId: string, actual: string) {
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/staff/performance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "actual", goalId, actual }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error ?? "Could not update actual");
      return;
    }
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm text-muted">
          Year{" "}
          <input
            type="number"
            className="ml-2 h-9 w-24 rounded-md border border-line px-2"
            value={year}
            onChange={(e) => setYear(Number(e.target.value) || year)}
          />
        </label>
        <div className="w-44">
          <Label>Period</Label>
          <PeriodSelect value={periodLabel} onChange={setPeriodLabel} />
        </div>
        <p className="text-sm text-muted">Your weighted KPI: {pct(kpi)}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Goals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={(e) => void addGoal(e)} className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <Label htmlFor="goalTitle">My goal</Label>
              <Input id="goalTitle" name="goalTitle" className="mt-1" required />
            </div>
            <div>
              <Label htmlFor="goalTarget">Target</Label>
              <Input id="goalTarget" name="goalTarget" className="mt-1" required />
            </div>
            <div>
              <Label htmlFor="goalActual">Actual</Label>
              <Input id="goalActual" name="goalActual" className="mt-1" />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={busy}>
                Add
              </Button>
            </div>
          </form>
          {goals.length === 0 ? (
            <p className="text-sm text-muted">No goals this year yet.</p>
          ) : (
            <ul className="divide-y divide-line rounded-md border border-line">
              {goals.map((goal) => (
                <li
                  key={goal.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
                >
                  <div>
                    <p className="font-medium text-ink">{goal.title}</p>
                    <p className="text-xs text-muted">
                      {GOAL_SCOPE_LABELS[goal.scope as GoalScope] ?? goal.scope}
                      {" · target "}
                      {goal.target}
                      {goal.actual ? ` · actual ${goal.actual}` : ""}
                      {` · ${pct(goal.achievementPercent)}`}
                    </p>
                  </div>
                  {goal.scope === "INDIVIDUAL" && goal.employeeId && (
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
                      />
                      <Button type="submit" size="sm" variant="outline" disabled={busy}>
                        Update
                      </Button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Self-assessment</CardTitle>
          <p className="text-sm text-muted">
            Submit your notes for {reviewPeriodLabel(periodLabel).toLowerCase()}.
            HR or your manager records the rest. This does not change pay.
          </p>
        </CardHeader>
        <CardContent>
          {current && (
            <p className="mb-3 text-sm text-muted">
              Status {current.status.toLowerCase()}
              {" · manager "}
              {score(current.managerScore)}
              {" · peer "}
              {score(current.peerScore)}
              {" · final "}
              {score(current.finalScore)}
            </p>
          )}
          {current?.status === "COMPLETED" ? (
            <p className="text-sm text-muted">
              {current.finalNotes || current.managerNotes || "This review is closed."}
            </p>
          ) : (
            <form
              key={`${year}-${periodLabel}`}
              onSubmit={(e) => void saveSelf(e)}
              className="space-y-3"
            >
              <div>
                <Label htmlFor="selfScore">Your score (1–5)</Label>
                <Input
                  id="selfScore"
                  name="selfScore"
                  type="number"
                  min={1}
                  max={5}
                  className="mt-1 w-24"
                  defaultValue={current?.selfScore ?? ""}
                />
              </div>
              <div>
                <Label htmlFor="selfNotes">Notes</Label>
                <textarea
                  id="selfNotes"
                  name="selfNotes"
                  rows={3}
                  className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm"
                  defaultValue={current?.selfNotes ?? ""}
                />
              </div>
              <Button type="submit" disabled={busy}>
                Submit self-assessment
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recognition</CardTitle>
        </CardHeader>
        <CardContent>
          {recognitions.length === 0 ? (
            <p className="text-sm text-muted">None recorded for you yet.</p>
          ) : (
            <ul className="divide-y divide-line rounded-md border border-line">
              {recognitions.map((row) => (
                <li key={row.id} className="px-3 py-2.5 text-sm">
                  <p className="font-medium text-ink">
                    {recognitionKindLabel(row.kind)}
                  </p>
                  {row.note ? <p className="text-sm text-muted">{row.note}</p> : null}
                  <p className="text-xs text-muted">
                    From {row.givenByName} ·{" "}
                    {new Date(row.createdAt).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {message && <p className="mt-3 text-sm text-signal">{message}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
