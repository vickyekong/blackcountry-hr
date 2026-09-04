"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

interface StaffHome {
  firstName: string;
  lastName: string;
  jobTitle: string;
  department: string;
  employeeCode: string;
  completeness: { percent: number; missing: string[] };
}

interface LeaveBalance {
  leaveType: string;
  remainingDays: number;
  entitledDays: number;
}

interface RequestRow {
  id: string;
  status: string;
}

interface PayslipRow {
  id: string;
  netPayKobo: string;
  payrollRun: { periodMonth: number; periodYear: number };
}

export default function StaffHomePage() {
  const [profile, setProfile] = useState<StaffHome | null>(null);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [pendingLeave, setPendingLeave] = useState(0);
  const [latestPayslip, setLatestPayslip] = useState<PayslipRow | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/staff/me").then((r) => r.json()),
      fetch("/api/staff/leave/balances").then((r) => r.json()),
      fetch("/api/staff/leave").then((r) => r.json()),
      fetch("/api/staff/requests").then((r) => r.json()),
      fetch("/api/payslips/mine").then((r) => r.json()),
    ])
      .then(([me, leaveBalances, leave, requests, payslips]) => {
        if (me?.error) {
          setError(me.error);
          return;
        }
        setProfile(me);
        setBalances(Array.isArray(leaveBalances) ? leaveBalances : []);
        setPendingLeave(
          Array.isArray(leave)
            ? leave.filter((l: RequestRow) => l.status === "PENDING").length
            : 0
        );
        setPendingRequests(
          Array.isArray(requests)
            ? requests.filter((r: RequestRow) => r.status === "PENDING").length
            : 0
        );
        setLatestPayslip(
          Array.isArray(payslips) && payslips.length > 0 ? payslips[0] : null
        );
      })
      .catch(() => setError("Could not load your portal"));
  }, []);

  const annual = balances.find((b) => b.leaveType === "ANNUAL");

  return (
    <AppShell>
      <div className="mb-8">
        <p className="text-sm text-muted">Staff portal</p>
        <h1 className="font-display text-2xl font-semibold text-ink">
          {profile
            ? `Hello, ${profile.firstName}`
            : "Your workspace"}
        </h1>
        {profile && (
          <p className="mt-1 text-sm text-muted">
            {profile.jobTitle} · {profile.department} · {profile.employeeCode}
          </p>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-signal">{error}</p>}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums text-ink">
              {profile?.completeness.percent ?? "—"}%
            </p>
            <p className="mt-1 text-xs text-muted">
              {profile?.completeness.missing.length
                ? `Still missing: ${profile.completeness.missing.slice(0, 3).join(", ")}`
                : "Your details look complete"}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href="/staff/profile">Fill in details</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Annual leave</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums text-ink">
              {annual?.remainingDays ?? "—"}
            </p>
            <p className="mt-1 text-xs text-muted">
              {annual
                ? `${annual.remainingDays} of ${annual.entitledDays} days left`
                : "Balance will appear after HR sets entitlement"}
            </p>
            <Button asChild variant="brand" size="sm" className="mt-4">
              <Link href="/staff/leave">Apply for leave</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Open items</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums text-ink">
              {pendingLeave + pendingRequests}
            </p>
            <p className="mt-1 text-xs text-muted">
              {pendingLeave} leave · {pendingRequests} company requests awaiting review
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href="/staff/requests">View requests</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>What you can do here</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted">
            <p>Update your personal details (next of kin, phone, address).</p>
            <p>Apply for leave. HR or Super Admin will approve or send it back.</p>
            <p>
              Request bank, tax, or other company changes — sensitive updates still
              need Super Admin clearance.
            </p>
            <p>Download approved payslips after Finance finishes processing.</p>
            <p>Log a week of hours on Timesheets against a project and task. HR validates the week — after that those hours cannot be changed. Open Projects to see the work you can log against, and Files for documents shared with you.</p>
            <p>Set your own goals and submit a self-assessment on Performance. Recognition from HR shows there too — none of it changes pay.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Latest payslip</CardTitle>
          </CardHeader>
          <CardContent>
            {latestPayslip ? (
              <>
                <p className="text-lg font-semibold tabular-nums text-ink">
                  {formatCurrency(latestPayslip.netPayKobo)}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {formatDate(
                    new Date(
                      latestPayslip.payrollRun.periodYear,
                      latestPayslip.payrollRun.periodMonth - 1,
                      1
                    )
                  )}{" "}
                  net pay
                </p>
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link href="/staff/payslips">All payslips</Link>
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted">
                Payslips appear here after Super Admin approves a payroll run.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
