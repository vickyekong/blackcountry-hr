"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  formatWeekRange,
  isoDateUtc,
  utcWeekDays,
  utcWeekStart,
} from "@/lib/timesheets/period";

type ProjectTask = { id: string; name: string; status: string };
type Project = { id: string; name: string; status: string; tasks: ProjectTask[] };
type Entry = {
  id: string;
  workDate: string;
  minutes: number;
  status: string;
  notes: string | null;
  project: { id: string; name: string };
  task: { id: string; name: string };
};

type WeekMeta = {
  weekStart: string;
  status: string;
  locked: boolean;
  returnReason: string | null;
  label: string;
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function shiftWeek(weekStart: string, days: number) {
  const start = utcWeekStart(weekStart);
  const next = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + days)
  );
  return isoDateUtc(next);
}

function statusVariant(status: string, locked: boolean) {
  if (locked) return "success" as const;
  if (status === "RETURNED") return "danger" as const;
  if (status === "SUBMITTED") return "warning" as const;
  return "default" as const;
}

function statusLabel(status: string, locked: boolean) {
  if (locked) return "Validated — locked";
  if (status === "RETURNED") return "Sent back";
  if (status === "SUBMITTED") return "Waiting for HR";
  return "Open";
}

export function WeeklyTimesheet({
  employeeId,
}: {
  /** When set, HR is logging for this person. */
  employeeId?: string;
}) {
  const [weekStart, setWeekStart] = useState(() => {
    const now = new Date();
    const local = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return isoDateUtc(utcWeekStart(local));
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [week, setWeek] = useState<WeekMeta | null>(null);
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [hours, setHours] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const days = useMemo(() => utcWeekDays(weekStart), [weekStart]);

  const load = useCallback(() => {
    const q = new URLSearchParams({ weekStart });
    if (employeeId) q.set("employeeId", employeeId);
    fetch(`/api/projects`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setProjects(list);
        setProjectId((current) => {
          const next =
            current && list.some((p: Project) => p.id === current)
              ? current
              : list.find((p: Project) => p.status === "ACTIVE")?.id || "";
          return next;
        });
      });
    fetch(`/api/timesheets/weeks?${q.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.entries) || data?.week) {
          setEntries(Array.isArray(data.entries) ? data.entries : []);
          setWeek(data.week ?? null);
        }
      });
  }, [weekStart, employeeId]);

  useEffect(() => {
    load();
  }, [load]);

  const activeTasks = useMemo(
    () =>
      (projects.find((p) => p.id === projectId)?.tasks ?? []).filter(
        (t) => t.status === "ACTIVE"
      ),
    [projects, projectId]
  );

  useEffect(() => {
    if (!activeTasks.some((t) => t.id === taskId)) {
      setTaskId(activeTasks[0]?.id ?? "");
    }
  }, [activeTasks, taskId]);

  const locked = Boolean(week?.locked);
  const totalHours = entries.reduce((sum, row) => sum + row.minutes, 0) / 60;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;
    setBusy(true);
    setError("");
    try {
      for (const day of days) {
        const iso = isoDateUtc(day);
        const raw = hours[iso];
        if (raw === undefined || raw === "") continue;
        const value = Number(raw);
        if (!Number.isFinite(value) || value <= 0) continue;
        const res = await fetch("/api/timesheets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(employeeId ? { employeeId } : {}),
            projectId,
            taskId,
            workDate: iso,
            minutes: Math.round(value * 60),
            notes: notes || null,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? "Could not save hours");
          setBusy(false);
          return;
        }
      }
      setHours({});
      setNotes("");
      load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (locked) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/timesheets/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not delete hours");
      return;
    }
    load();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(shiftWeek(weekStart, -7))}
          >
            Previous week
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(shiftWeek(weekStart, 7))}
          >
            Next week
          </Button>
        </div>
        <p className="text-sm font-medium text-ink">
          {formatWeekRange(weekStart)}
        </p>
        <Badge variant={statusVariant(week?.status ?? "OPEN", locked)}>
          {statusLabel(week?.status ?? "OPEN", locked)}
        </Badge>
      </div>

      {week?.status === "RETURNED" && week.returnReason ? (
        <p className="mb-4 rounded-md border border-signal/30 bg-signal/5 px-3 py-2 text-sm text-signal">
          HR sent this week back: {week.returnReason}
        </p>
      ) : null}

      {locked ? (
        <p className="mb-4 rounded-md border border-ok/30 bg-ok/5 px-3 py-2 text-sm text-ok">
          HR validated this week. These hours are locked and will count on
          payroll.
        </p>
      ) : (
        <p className="mb-4 text-sm text-muted">
          Log the week against a project and task, then HR validates it. After
          validation you cannot change this week.
        </p>
      )}

      {error && <p className="mb-4 text-sm text-signal">{error}</p>}

      {!locked && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Log this week</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={save} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="projectId">Project</Label>
                  <select
                    id="projectId"
                    name="projectId"
                    required
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="mt-1 flex h-9 w-full rounded-md border border-line px-3 text-sm"
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
                  <Label htmlFor="taskId">Task</Label>
                  <select
                    id="taskId"
                    name="taskId"
                    required
                    value={taskId}
                    onChange={(e) => setTaskId(e.target.value)}
                    className="mt-1 flex h-9 w-full rounded-md border border-line px-3 text-sm"
                  >
                    <option value="">Select</option>
                    {activeTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Input
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {days.map((day, i) => {
                  const iso = isoDateUtc(day);
                  return (
                    <div key={iso}>
                      <Label htmlFor={`h-${iso}`} className="text-xs">
                        {DAY_LABELS[i]} {day.getUTCDate()}
                      </Label>
                      <Input
                        id={`h-${iso}`}
                        type="number"
                        min={0.25}
                        step={0.25}
                        placeholder="h"
                        value={hours[iso] ?? ""}
                        onChange={(e) =>
                          setHours((prev) => ({ ...prev, [iso]: e.target.value }))
                        }
                        className="mt-1"
                      />
                    </div>
                  );
                })}
              </div>
              <Button type="submit" variant="brand" disabled={busy || !projectId || !taskId}>
                {busy ? "Saving…" : "Save hours"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="rounded-lg border border-line bg-foam">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="text-sm font-medium text-ink">Hours this week</p>
          <p className="text-sm tabular-nums text-muted">{totalHours.toFixed(2)}h</p>
        </div>
        <ul className="divide-y divide-sand">
          {entries.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <span>
                {isoDateUtc(row.workDate)} · {row.project.name} /{" "}
                {row.task?.name ?? "Task"} · {(row.minutes / 60).toFixed(2)}h
              </span>
              <span className="flex items-center gap-2">
                <Badge>{row.status.replace(/_/g, " ")}</Badge>
                {!locked && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void remove(row.id)}
                  >
                    Remove
                  </Button>
                )}
              </span>
            </li>
          ))}
          {entries.length === 0 && (
            <li className="px-4 py-6 text-sm text-muted">No hours logged this week.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
