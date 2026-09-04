"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RECOGNITION_KINDS,
  RECOGNITION_KIND_LABELS,
  recognitionKindLabel,
} from "@/lib/performance/labels";

type StaffOption = { id: string; name: string };

type RecognitionRow = {
  id: string;
  kind: string;
  note: string;
  createdAt: string;
  employeeName: string;
  givenByName: string;
};

export function PerformanceRecognitionPanel({ year }: { year: number }) {
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [rows, setRows] = useState<RecognitionRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function load() {
    fetch(`/api/performance?year=${year}`)
      .then((r) => r.json())
      .then((data) => {
        setStaff(Array.isArray(data.staff) ? data.staff : []);
        setRows(Array.isArray(data.recognitions) ? data.recognitions : []);
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
    const res = await fetch("/api/performance/recognition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: form.employeeId.value,
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
      <Card>
        <CardHeader>
          <CardTitle>Give recognition</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void add(e)} className="grid gap-3 sm:grid-cols-2">
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
            <div>
              <Label htmlFor="kind">Kind</Label>
              <select
                id="kind"
                name="kind"
                className="mt-1 h-9 w-full rounded-md border border-line bg-white px-2 text-sm"
                required
              >
                {RECOGNITION_KINDS.map((id) => (
                  <option key={id} value={id}>
                    {RECOGNITION_KIND_LABELS[id]}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="note">Note</Label>
              <Input id="note" name="note" className="mt-1" maxLength={1000} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy}>
                Add to history
              </Button>
            </div>
          </form>
          {message && <p className="mt-3 text-sm text-red-600">{message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted">No recognition recorded yet.</p>
          ) : (
            <ul className="divide-y divide-line rounded-md border border-line">
              {rows.map((row) => (
                <li key={row.id} className="px-3 py-2.5 text-sm">
                  <p className="font-medium text-ink">
                    {row.employeeName} · {recognitionKindLabel(row.kind)}
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
        </CardContent>
      </Card>
    </div>
  );
}
