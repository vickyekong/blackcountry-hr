"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

type Project = { id: string; name: string; status: string };
type Entry = {
  id: string;
  workDate: string;
  minutes: number;
  status: string;
  project: { name: string };
};

export default function StaffTimesheetsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []));
    fetch("/api/timesheets")
      .then((r) => r.json())
      .then((data) => setEntries(Array.isArray(data) ? data : []));
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const hours = Number(form.get("hours"));
    const res = await fetch("/api/timesheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: form.get("projectId"),
        workDate: form.get("workDate"),
        minutes: Math.round(hours * 60),
        notes: form.get("notes") || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not submit hours");
      return;
    }
    e.currentTarget.reset();
    load();
  }

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink">Timesheets</h1>
        <p className="mt-1 text-sm text-muted">
          Log hours against company projects. HR or your business head approve
          them before they count on the payroll period.
        </p>
      </div>
      {error && <p className="mb-4 text-sm text-signal">{error}</p>}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Log hours</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="projectId">Project</Label>
              <select
                id="projectId"
                name="projectId"
                required
                className="mt-1 flex h-9 w-full rounded-md border border-stone-300 px-3 text-sm"
              >
                <option value="">Select</option>
                {projects
                  .filter((p) => p.status === "ACTIVE")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <Label htmlFor="workDate">Date</Label>
              <Input id="workDate" name="workDate" type="date" required className="mt-1" />
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
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" name="notes" className="mt-1" />
            </div>
            <div>
              <Button type="submit" variant="brand" disabled={busy}>
                Submit
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ul className="space-y-2">
        {entries.map((row) => (
          <li
            key={row.id}
            className="flex items-center justify-between rounded-lg border border-line bg-foam px-4 py-3 text-sm"
          >
            <span>
              {formatDate(row.workDate)} · {row.project.name} ·{" "}
              {(row.minutes / 60).toFixed(2)}h
            </span>
            <Badge>{row.status.replace(/_/g, " ")}</Badge>
          </li>
        ))}
        {entries.length === 0 && (
          <li className="text-sm text-muted">No hours logged yet.</li>
        )}
      </ul>
    </AppShell>
  );
}
