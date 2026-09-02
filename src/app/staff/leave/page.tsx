"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { countWorkingDaysBetween } from "@/lib/leave/unpaid-leave";
import { localDateKey } from "@/lib/time/dates";

interface LeaveRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
  reason?: string;
}

interface LeaveBalance {
  id: string;
  leaveType: string;
  entitledDays: number;
  usedDays: number;
  remainingDays: number;
}

export default function StaffLeavePage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [holidayKeys, setHolidayKeys] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [computedDays, setComputedDays] = useState<number | null>(null);
  const [formError, setFormError] = useState("");

  function load() {
    fetch("/api/staff/leave")
      .then((r) => r.json())
      .then((data) => setRequests(Array.isArray(data) ? data : []));
    fetch("/api/staff/leave/balances")
      .then((r) => r.json())
      .then((data) => setBalances(Array.isArray(data) ? data : []));
    fetch(`/api/holidays?year=${new Date().getFullYear()}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setHolidayKeys(
            data.map((h: { workDate: string }) =>
              localDateKey(new Date(h.workDate))
            )
          );
        }
      });
  }

  useEffect(() => {
    load();
  }, []);

  function updateComputedDays(start: string, end: string) {
    if (!start || !end) {
      setComputedDays(null);
      return;
    }
    setComputedDays(countWorkingDaysBetween(new Date(start), new Date(end), holidayKeys));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    const form = new FormData(e.currentTarget);
    const startDate = form.get("startDate") as string;
    const endDate = form.get("endDate") as string;
    const days =
      computedDays ??
      countWorkingDaysBetween(new Date(startDate), new Date(endDate), holidayKeys);

    const res = await fetch("/api/staff/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: form.get("type"),
        startDate,
        endDate,
        days,
        reason: form.get("reason"),
      }),
    });
    if (res.ok) {
      setShowForm(false);
      setComputedDays(null);
      load();
    } else {
      const data = await res.json();
      setFormError(data.error ?? "Could not submit leave");
    }
  }

  async function withdraw(id: string) {
    await fetch(`/api/staff/leave/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    load();
  }

  return (
    <AppShell>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Leave</h1>
          <p className="mt-1 text-sm text-muted">
            Apply for your own leave. HR or Super Admin will approve or send it back.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant="brand">
          {showForm ? "Close" : "Apply for leave"}
        </Button>
      </div>

      {balances.length > 0 && (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          {balances.map((b) => (
            <Card key={b.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {b.leaveType.replace("_", " ")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">
                  {b.remainingDays}
                </p>
                <p className="text-xs text-muted">
                  of {b.entitledDays} days remaining
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <Card className="mb-6 max-w-lg">
          <CardHeader>
            <CardTitle>New leave request</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  name="type"
                  className="mt-1 flex h-9 w-full rounded-lg border border-line bg-foam px-3 text-sm"
                  required
                >
                  <option value="ANNUAL">Annual</option>
                  <option value="SICK">Sick</option>
                  <option value="MATERNITY">Maternity</option>
                  <option value="PATERNITY">Paternity</option>
                  <option value="UNPAID">Unpaid</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="startDate">Start</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    required
                    className="mt-1"
                    onChange={(e) => {
                      const end = (
                        document.getElementById("endDate") as HTMLInputElement
                      )?.value;
                      updateComputedDays(e.target.value, end);
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End</Label>
                  <Input
                    id="endDate"
                    name="endDate"
                    type="date"
                    required
                    className="mt-1"
                    onChange={(e) => {
                      const start = (
                        document.getElementById("startDate") as HTMLInputElement
                      )?.value;
                      updateComputedDays(start, e.target.value);
                    }}
                  />
                </div>
              </div>
              {computedDays !== null && (
                <p className="text-sm text-muted">
                  Working days:{" "}
                  <span className="font-medium text-ink">{computedDays}</span>
                </p>
              )}
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Input id="reason" name="reason" className="mt-1" />
              </div>
              {formError && <p className="text-sm text-signal">{formError}</p>}
              <Button
                type="submit"
                variant="brand"
                disabled={computedDays !== null && computedDays < 1}
              >
                Submit for approval
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="overflow-hidden rounded-xl border border-line/80 bg-foam/95">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted">
                  No leave requests yet.
                </TableCell>
              </TableRow>
            ) : (
              requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.type.replace("_", " ")}</TableCell>
                  <TableCell>
                    {formatDate(r.startDate)} – {formatDate(r.endDate)}
                  </TableCell>
                  <TableCell>{r.days}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.status === "APPROVED"
                          ? "success"
                          : r.status === "REJECTED" || r.status === "CANCELLED"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {r.status === "PENDING" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => withdraw(r.id)}
                      >
                        Withdraw
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
