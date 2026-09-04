"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { employeeFullName } from "@/lib/utils";
import {
  DAILY_CAPACITY_MINUTES,
  isOverDailyCapacity,
  minutesToHours,
} from "@/lib/projects/workload";
import { isoDateUtc, utcWeekStart } from "@/lib/timesheets/period";

type Staff = {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
};

type Slot = {
  id: string;
  employeeId: string;
  projectId: string;
  projectName: string;
  workDate: string;
  plannedMinutes: number;
  plannedHours: number;
};

type Logged = {
  employeeId: string;
  workDate: string;
  minutes: number;
  hours: number;
};

type Day = { date: string; label: string };

function shiftWeek(weekStart: string, days: number) {
  const start = utcWeekStart(weekStart);
  const next = new Date(
    Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth(),
      start.getUTCDate() + days
    )
  );
  return isoDateUtc(next);
}

export function WorkSchedulePanel() {
  const [weekStart, setWeekStart] = useState(() =>
    isoDateUtc(utcWeekStart(new Date()))
  );
  const [weekLabel, setWeekLabel] = useState("");
  const [canEdit, setCanEdit] = useState(false);
  const [days, setDays] = useState<Day[]>([]);
  const [employees, setEmployees] = useState<Staff[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>(
    []
  );
  const [slots, setSlots] = useState<Slot[]>([]);
  const [logged, setLogged] = useState<Logged[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/projects/schedule?weekStart=${weekStart}`)
      .then((r) => r.json())
      .then((data) => {
        setWeekLabel(data.weekLabel ?? "");
        setCanEdit(Boolean(data.canEdit));
        setDays(Array.isArray(data.days) ? data.days : []);
        setEmployees(Array.isArray(data.employees) ? data.employees : []);
        setProjects(Array.isArray(data.projects) ? data.projects : []);
        setSlots(Array.isArray(data.slots) ? data.slots : []);
        setLogged(Array.isArray(data.logged) ? data.logged : []);
      });
  }, [weekStart]);

  useEffect(() => {
    load();
  }, [load]);

  const slotsByCell = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const slot of slots) {
      const key = `${slot.employeeId}:${slot.workDate}`;
      const list = map.get(key) ?? [];
      list.push(slot);
      map.set(key, list);
    }
    return map;
  }, [slots]);

  const loggedByCell = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of logged) {
      map.set(`${row.employeeId}:${row.workDate}`, row.minutes);
    }
    return map;
  }, [logged]);

  async function saveSlot(
    employeeId: string,
    projectId: string,
    workDate: string,
    plannedHours: number
  ) {
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/projects/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "upsert",
        employeeId,
        projectId,
        workDate,
        plannedHours,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(json.error ?? "Could not save schedule");
      return;
    }
    load();
  }

  async function fillWeek() {
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/projects/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "fill-week", weekStart }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(json.error ?? "Could not fill the week");
      return;
    }
    load();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Week schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted">
          Plan who is on which project each day. This does not change timesheets
          or PAYE — logged hours still come from Timesheets. A full day is{" "}
          {minutesToHours(DAILY_CAPACITY_MINUTES)} hours.
        </p>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
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
          <p className="text-sm font-medium text-ink">{weekLabel || weekStart}</p>
          {canEdit ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void fillWeek()}
            >
              Fill from weekly plan
            </Button>
          ) : null}
        </div>
        {message ? <p className="mb-3 text-sm text-signal">{message}</p> : null}
        {employees.length === 0 ? (
          <p className="text-sm text-muted">
            Add people to a project team first, then schedule their days.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-foam px-2 py-2 text-left font-medium text-ink">
                    Person
                  </th>
                  {days.map((day) => (
                    <th
                      key={day.date}
                      className="px-2 py-2 text-left font-medium text-muted"
                    >
                      {day.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((person) => (
                  <tr key={person.id} className="align-top">
                    <td className="sticky left-0 border-t border-line bg-foam px-2 py-2 font-medium text-ink">
                      {employeeFullName(person.firstName, person.lastName)}
                    </td>
                    {days.map((day) => {
                      const key = `${person.id}:${day.date}`;
                      const cellSlots = slotsByCell.get(key) ?? [];
                      const planned = cellSlots.reduce(
                        (sum, slot) => sum + slot.plannedMinutes,
                        0
                      );
                      const over = isOverDailyCapacity(planned);
                      const loggedMinutes = loggedByCell.get(key) ?? 0;
                      return (
                        <td
                          key={day.date}
                          className="border-t border-line px-2 py-2"
                        >
                          <p
                            className={
                              over
                                ? "text-xs text-signal"
                                : "text-xs text-muted"
                            }
                          >
                            Plan {minutesToHours(planned)}h
                            {loggedMinutes
                              ? ` · logged ${minutesToHours(loggedMinutes)}h`
                              : ""}
                          </p>
                          <ul className="mt-1 space-y-1">
                            {cellSlots.map((slot) => (
                              <li
                                key={slot.id}
                                className="flex items-center justify-between gap-1 text-xs"
                              >
                                <span className="truncate">{slot.projectName}</span>
                                {canEdit ? (
                                  <button
                                    type="button"
                                    className="text-muted hover:text-signal"
                                    onClick={() =>
                                      void saveSlot(
                                        person.id,
                                        slot.projectId,
                                        day.date,
                                        0
                                      )
                                    }
                                  >
                                    ×
                                  </button>
                                ) : (
                                  <span>{slot.plannedHours}h</span>
                                )}
                              </li>
                            ))}
                          </ul>
                          {canEdit ? (
                            <form
                              className="mt-2 flex items-center gap-1"
                              onSubmit={(e) => {
                                e.preventDefault();
                                const form = e.currentTarget;
                                const projectId = (
                                  form.elements.namedItem(
                                    "projectId"
                                  ) as HTMLSelectElement
                                ).value;
                                const hours = Number(
                                  (
                                    form.elements.namedItem(
                                      "hours"
                                    ) as HTMLInputElement
                                  ).value || 0
                                );
                                if (!projectId) return;
                                void saveSlot(
                                  person.id,
                                  projectId,
                                  day.date,
                                  hours
                                );
                                form.reset();
                              }}
                            >
                              <select
                                name="projectId"
                                required
                                className="h-7 min-w-0 flex-1 rounded border border-line px-1 text-xs"
                                defaultValue=""
                              >
                                <option value="">Project</option>
                                {projects.map((project) => (
                                  <option key={project.id} value={project.id}>
                                    {project.name}
                                  </option>
                                ))}
                              </select>
                              <Input
                                name="hours"
                                type="number"
                                min={0}
                                max={24}
                                step={0.5}
                                placeholder="h"
                                className="h-7 w-14 px-1 text-xs"
                                required
                              />
                              <Button
                                type="submit"
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                className="h-7 px-2 text-xs"
                              >
                                Add
                              </Button>
                            </form>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
