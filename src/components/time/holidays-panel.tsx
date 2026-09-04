"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { HOLIDAY_KINDS, holidayKindLabel } from "@/lib/time/labels";

type Holiday = {
  id: string;
  workDate: string;
  name: string;
  kind: string;
};

export function HolidaysPanel() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function load(nextYear = year) {
    fetch(`/api/holidays?year=${nextYear}`)
      .then((r) => r.json())
      .then((data) => setHolidays(Array.isArray(data) ? data : []));
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
    const data = new FormData(form);
    const res = await fetch("/api/holidays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workDate: data.get("workDate"),
        name: data.get("name"),
        kind: data.get("kind"),
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(json.error ?? "Could not save holiday");
      return;
    }
    form.reset();
    load();
  }

  async function remove(id: string) {
    setBusy(true);
    await fetch(`/api/holidays/${id}`, { method: "DELETE" });
    setBusy(false);
    load();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company holidays</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted">
            Holidays are skipped when counting leave working days. They do not
            change PAYE rates.
          </p>
          <div className="mb-4 flex items-end gap-3">
            <div>
              <Label htmlFor="holidayYear">Year</Label>
              <Input
                id="holidayYear"
                type="number"
                className="w-28"
                value={year}
                onChange={(e) => setYear(Number(e.target.value) || year)}
              />
            </div>
          </div>
          <form onSubmit={add} className="mb-6 grid gap-3 sm:grid-cols-4">
            <div>
              <Label htmlFor="workDate">Date</Label>
              <Input id="workDate" name="workDate" type="date" required />
            </div>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required placeholder="Democracy Day" />
            </div>
            <div>
              <Label htmlFor="kind">Kind</Label>
              <select
                id="kind"
                name="kind"
                className="mt-1 flex h-9 w-full rounded-md border border-line px-3 text-sm"
                defaultValue="PUBLIC"
              >
                {HOLIDAY_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {holidayKindLabel(kind)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={busy}>
                Add holiday
              </Button>
            </div>
          </form>
          {message ? <p className="mb-3 text-sm text-red-700">{message}</p> : null}
          {holidays.length === 0 ? (
            <p className="text-sm text-muted">No holidays recorded for {year}.</p>
          ) : (
            <ul className="divide-y divide-line">
              {holidays.map((holiday) => (
                <li
                  key={holiday.id}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-ink">{holiday.name}</p>
                    <p className="text-muted">
                      {formatDate(holiday.workDate)} · {holidayKindLabel(holiday.kind)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => remove(holiday.id)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
