"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PeriodSelect } from "@/components/talent/period-select";
import {
  GOAL_SCOPE_LABELS,
  RECOGNITION_KINDS,
  RECOGNITION_KIND_LABELS,
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
  weight: number;
  scope: GoalScope | string;
  periodLabel: string;
  achievementPercent: number | null;
};

type Review = {
  id: string;
  periodYear: number;
  periodLabel: string;
  status: string;
  selfNotes: string | null;
  managerNotes: string | null;
  peerNotes: string | null;
  finalNotes: string | null;
  selfScore: number | null;
  managerScore: number | null;
  peerScore: number | null;
  finalScore: number | null;
  peerEmployeeId: string | null;
  peerName: string | null;
  suggestedFinalScore: number | null;
};

type RecognitionRow = {
  id: string;
  kind: string;
  note: string;
  createdAt: string;
  givenByName: string;
};

type PeerOption = { id: string; name: string };

function pct(value: number | null | undefined) {
  return value == null ? "—" : `${value}%`;
}

export function EmployeePerformancePanel({
  employeeId,
  canManage,
  canReview,
}: {
  employeeId: string;
  canManage: boolean;
  canReview?: boolean;
}) {
  const canWrite = canManage || Boolean(canReview);
  const [year, setYear] = useState(new Date().getFullYear());
  const [periodLabel, setPeriodLabel] = useState<ReviewPeriod>("ANNUAL");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [recognitions, setRecognitions] = useState<RecognitionRow[]>([]);
  const [peers, setPeers] = useState<PeerOption[]>([]);
  const [kpi, setKpi] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    fetch(`/api/employees/${employeeId}/performance?year=${year}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.goals)) setGoals(data.goals);
        if (Array.isArray(data.reviews)) setReviews(data.reviews);
        if (Array.isArray(data.recognitions)) setRecognitions(data.recognitions);
        if (Array.isArray(data.peers)) setPeers(data.peers);
        setKpi(data.kpi?.weightedAchievement ?? null);
      })
      .catch(() => undefined);
  }, [employeeId, year]);

  useEffect(() => {
    load();
  }, [load]);

  const current = reviews.find((row) => row.periodLabel === periodLabel);

  async function addGoal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setMessage("");
    const res = await fetch(`/api/employees/${employeeId}/performance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.goalTitle.value,
        target: form.goalTarget.value,
        actual: form.goalActual.value || "",
        weight: Number(form.goalWeight.value || 100),
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

  async function saveReview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setMessage("");
    const res = await fetch(`/api/employees/${employeeId}/performance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "review",
        periodYear: year,
        periodLabel,
        selfNotes: form.selfNotes.value || null,
        managerNotes: form.managerNotes.value || null,
        peerNotes: form.peerNotes.value || null,
        finalNotes: form.finalNotes.value || null,
        selfScore: form.selfScore.value ? Number(form.selfScore.value) : null,
        managerScore: form.managerScore.value
          ? Number(form.managerScore.value)
          : null,
        peerScore: form.peerScore.value ? Number(form.peerScore.value) : null,
        finalScore: form.finalScore.value
          ? Number(form.finalScore.value)
          : null,
        peerEmployeeId: form.peerEmployeeId.value || null,
        status: "COMPLETED",
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? "Could not save review");
      return;
    }
    load();
  }

  async function addRecognition(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/performance/recognition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId,
        kind: form.kind.value,
        note: form.note.value || "",
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? "Could not save recognition");
      return;
    }
    form.reset();
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
          <Label>Review period</Label>
          <PeriodSelect
            value={periodLabel}
            onChange={setPeriodLabel}
          />
        </div>
        <p className="text-sm text-muted">
          Weighted KPI: {pct(kpi)}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Goals &amp; KPIs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canWrite && (
            <form onSubmit={(e) => void addGoal(e)} className="grid gap-3 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <Label htmlFor="goalTitle">Goal</Label>
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
              <div className="sm:col-span-4">
                <Button type="submit" disabled={busy}>
                  Add individual goal
                </Button>
              </div>
            </form>
          )}
          {goals.length === 0 ? (
            <p className="text-sm text-muted">No goals this cycle.</p>
          ) : (
            <ul className="divide-y divide-line rounded-md border border-line">
              {goals.map((goal) => (
                <li key={goal.id} className="px-3 py-2.5 text-sm">
                  <p className="font-medium text-ink">{goal.title}</p>
                  <p className="text-xs text-muted">
                    {GOAL_SCOPE_LABELS[goal.scope as GoalScope] ?? goal.scope}
                    {" · "}
                    {reviewPeriodLabel(goal.periodLabel)}
                    {" · target "}
                    {goal.target}
                    {goal.unit ? ` ${goal.unit}` : ""}
                    {goal.actual ? ` · actual ${goal.actual}` : ""}
                    {` · ${pct(goal.achievementPercent)}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appraisal</CardTitle>
          <p className="text-sm text-muted">
            Scores are 1–5. Completing a review does not change pay.
          </p>
        </CardHeader>
        <CardContent>
          {current && (
            <p className="mb-3 text-sm text-muted">
              {current.periodYear} {reviewPeriodLabel(current.periodLabel)}:{" "}
              {current.status}
              {current.suggestedFinalScore
                ? ` · suggested final ${current.suggestedFinalScore}`
                : ""}
            </p>
          )}
          {canWrite ? (
            <form
              key={`${year}-${periodLabel}`}
              onSubmit={(e) => void saveReview(e)}
              className="grid gap-3 sm:grid-cols-2"
            >
              <div>
                <Label htmlFor="selfScore">Self score</Label>
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
                <Label htmlFor="managerScore">Manager score</Label>
                <Input
                  id="managerScore"
                  name="managerScore"
                  type="number"
                  min={1}
                  max={5}
                  className="mt-1 w-24"
                  defaultValue={current?.managerScore ?? ""}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="selfNotes">Self-assessment</Label>
                <textarea
                  id="selfNotes"
                  name="selfNotes"
                  rows={2}
                  className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm"
                  defaultValue={current?.selfNotes ?? ""}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="managerNotes">Manager notes</Label>
                <textarea
                  id="managerNotes"
                  name="managerNotes"
                  rows={2}
                  className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm"
                  defaultValue={current?.managerNotes ?? ""}
                />
              </div>
              <div>
                <Label htmlFor="peerEmployeeId">Peer</Label>
                <select
                  id="peerEmployeeId"
                  name="peerEmployeeId"
                  className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-sm"
                  defaultValue={current?.peerEmployeeId ?? ""}
                >
                  <option value="">None</option>
                  {peers.map((peer) => (
                    <option key={peer.id} value={peer.id}>
                      {peer.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="peerScore">Peer score</Label>
                <Input
                  id="peerScore"
                  name="peerScore"
                  type="number"
                  min={1}
                  max={5}
                  className="mt-1 w-24"
                  defaultValue={current?.peerScore ?? ""}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="peerNotes">Peer notes</Label>
                <textarea
                  id="peerNotes"
                  name="peerNotes"
                  rows={2}
                  className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm"
                  defaultValue={current?.peerNotes ?? ""}
                />
              </div>
              <div>
                <Label htmlFor="finalScore">Final assessment</Label>
                <Input
                  id="finalScore"
                  name="finalScore"
                  type="number"
                  min={1}
                  max={5}
                  className="mt-1 w-24"
                  defaultValue={current?.finalScore ?? ""}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="finalNotes">Final notes</Label>
                <textarea
                  id="finalNotes"
                  name="finalNotes"
                  rows={2}
                  className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm"
                  defaultValue={current?.finalNotes ?? ""}
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={busy}>
                  Save {reviewPeriodLabel(periodLabel).toLowerCase()} review
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-muted">
              {current?.finalNotes ||
                current?.managerNotes ||
                "No review notes yet."}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recognition</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canWrite && (
            <form onSubmit={(e) => void addRecognition(e)} className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="kind">Kind</Label>
                <select
                  id="kind"
                  name="kind"
                  className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-sm"
                >
                  {RECOGNITION_KINDS.map((id) => (
                    <option key={id} value={id}>
                      {RECOGNITION_KIND_LABELS[id]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="note">Note</Label>
                <Input id="note" name="note" className="mt-1" />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={busy}>
                  Add recognition
                </Button>
              </div>
            </form>
          )}
          {recognitions.length === 0 ? (
            <p className="text-sm text-muted">None recorded.</p>
          ) : (
            <ul className="divide-y divide-line rounded-md border border-line">
              {recognitions.map((row) => (
                <li key={row.id} className="px-3 py-2.5 text-sm">
                  <p className="font-medium text-ink">
                    {recognitionKindLabel(row.kind)}
                  </p>
                  {row.note ? (
                    <p className="text-sm text-muted">{row.note}</p>
                  ) : null}
                  <p className="text-xs text-muted">
                    From {row.givenByName} ·{" "}
                    {new Date(row.createdAt).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {message && <p className="text-sm text-red-600">{message}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
