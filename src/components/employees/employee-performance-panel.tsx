"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Goal = {
  id: string;
  title: string;
  target: string;
  actual: string;
  weight: number;
  periodYear: number;
};

type Review = {
  id: string;
  periodYear: number;
  periodLabel: string;
  status: string;
  selfNotes: string | null;
  managerNotes: string | null;
  selfScore: number | null;
  managerScore: number | null;
};

export function EmployeePerformancePanel({
  employeeId,
  canManage,
}: {
  employeeId: string;
  canManage: boolean;
}) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    fetch(`/api/employees/${employeeId}/performance`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.goals)) setGoals(data.goals);
        if (Array.isArray(data.reviews)) setReviews(data.reviews);
      })
      .catch(() => undefined);
  }, [employeeId]);

  useEffect(() => {
    load();
  }, [load]);

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
        periodLabel: "ANNUAL",
        managerNotes: form.managerNotes.value || null,
        selfNotes: form.selfNotes.value || null,
        managerScore: form.managerScore.value
          ? Number(form.managerScore.value)
          : null,
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

  const latest = reviews[0];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Goals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canManage && (
            <form onSubmit={(e) => void addGoal(e)} className="grid gap-3 sm:grid-cols-3">
              <div>
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
              <div className="sm:col-span-3">
                <Button type="submit" disabled={busy}>
                  Add goal
                </Button>
              </div>
            </form>
          )}
          {goals.length === 0 ? (
            <p className="text-sm text-stone-500">No goals this cycle.</p>
          ) : (
            <ul className="divide-y divide-stone-100 rounded-md border border-stone-200">
              {goals.map((goal) => (
                <li key={goal.id} className="px-3 py-2.5 text-sm">
                  <p className="font-medium text-stone-900">{goal.title}</p>
                  <p className="text-xs text-stone-500">
                    Target {goal.target}
                    {goal.actual ? ` · actual ${goal.actual}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Annual review</CardTitle>
          <p className="text-sm text-stone-500">
            Scores are 1–5. Completing a review does not change pay.
          </p>
        </CardHeader>
        <CardContent>
          {latest && (
            <p className="mb-3 text-sm text-stone-600">
              Latest {latest.periodYear} {latest.periodLabel}: {latest.status}
              {latest.managerScore ? ` · manager ${latest.managerScore}/5` : ""}
            </p>
          )}
          {canManage ? (
            <form onSubmit={(e) => void saveReview(e)} className="space-y-3">
              <div>
                <Label htmlFor="managerScore">Manager score</Label>
                <Input
                  id="managerScore"
                  name="managerScore"
                  type="number"
                  min={1}
                  max={5}
                  className="mt-1 w-24"
                  defaultValue={latest?.managerScore ?? ""}
                />
              </div>
              <div>
                <Label htmlFor="managerNotes">Manager notes</Label>
                <textarea
                  id="managerNotes"
                  name="managerNotes"
                  rows={3}
                  className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                  defaultValue={latest?.managerNotes ?? ""}
                />
              </div>
              <div>
                <Label htmlFor="selfNotes">Self-assessment notes</Label>
                <textarea
                  id="selfNotes"
                  name="selfNotes"
                  rows={3}
                  className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                  defaultValue={latest?.selfNotes ?? ""}
                />
              </div>
              <Button type="submit" disabled={busy}>
                Save review
              </Button>
            </form>
          ) : (
            <p className="text-sm text-stone-500">
              {latest?.managerNotes || "No review notes yet."}
            </p>
          )}
          {message && <p className="mt-3 text-sm text-red-600">{message}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
