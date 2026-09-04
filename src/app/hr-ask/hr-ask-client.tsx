"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { can, canReviewChangeType } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

interface QueryDef {
  id: string;
  label: string;
  hint: string;
}

interface AskResult {
  id: string;
  title: string;
  summary: string;
  href?: string;
  rows: Array<Record<string, string>>;
}

interface PendingChange {
  id: string;
  type: string;
  status: string;
  payload: Record<string, string>;
  note: string | null;
  company?: { name: string };
  employee: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    department: string;
  };
  createdAt: string;
}

export default function HrAskClient() {
  const { data: session } = useSession();
  const role = session?.user?.role as UserRole | undefined;
  const canApproveChanges = role ? can(role, "approveChangeRequests") : false;
  const searchParams = useSearchParams();
  const initialTab =
    searchParams.get("tab") === "changes" ? "changes" : "ask";
  const [tab, setTab] = useState<"ask" | "changes">(initialTab);
  const [queries, setQueries] = useState<QueryDef[]>([]);
  const [result, setResult] = useState<AskResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<PendingChange[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/hr-ask")
      .then((r) => r.json())
      .then((data) => setQueries(data.queries ?? []));
  }, []);

  useEffect(() => {
    if (tab !== "changes") return;
    fetch("/api/change-requests?scope=pending")
      .then((r) => r.json())
      .then((data) => setPending(Array.isArray(data) ? data : []));
  }, [tab]);

  async function runQuery(id: string) {
    setLoading(true);
    const res = await fetch(`/api/hr-ask?q=${encodeURIComponent(id)}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      alert(data.error ?? "Query failed");
      return;
    }
    setResult(data);
  }

  async function review(requestId: string, action: "approve" | "reject") {
    setBusyId(requestId);
    const res = await fetch("/api/change-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, action }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      alert(data.error ?? "Action failed");
      return;
    }
    setPending((prev) => prev.filter((p) => p.id !== requestId));
  }

  const columns = useMemo(() => {
    if (!result?.rows.length) return [] as string[];
    return Object.keys(result.rows[0]);
  }, [result]);

  return (
    <AppShell>
      <PageHeader
        icon={MessageCircle}
        title="HR Ask"
        description="Policy & query desk — plus staff and HR change requests awaiting review"
      />

      <div className="mb-6 flex gap-2">
        <Button
          variant={tab === "ask" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("ask")}
        >
          <MessageCircle className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
          Ask HR
        </Button>
        <Button
          variant={tab === "changes" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("changes")}
        >
          <Send className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
          Change requests
        </Button>
      </div>

      {tab === "ask" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {queries.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => runQuery(q.id)}
                  className="block w-full rounded-md border border-line px-3 py-2 text-left text-sm hover:bg-sand"
                >
                  <span className="font-medium text-ink">{q.label}</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {q.hint}
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{result?.title ?? "Results"}</CardTitle>
              {result && (
                <p className="text-sm text-muted">{result.summary}</p>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted">Running…</p>
              ) : !result ? (
                <p className="text-sm text-muted">
                  Pick a question to generate a live report from staff, leave,
                  onboarding, and payroll data.
                </p>
              ) : result.rows.length === 0 ? (
                <p className="text-sm text-muted">No matching rows.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columns.map((c) => (
                        <TableHead key={c} className="capitalize">
                          {c.replace(/([A-Z])/g, " $1")}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.rows.map((row, i) => (
                      <TableRow key={i}>
                        {columns.map((c) => (
                          <TableCell key={c}>{row[c]}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "changes" && (
        <Card>
          <CardHeader>
            <CardTitle>Pending employee updates</CardTitle>
            <p className="text-sm text-muted">
              Staff can submit these from their portal. Bank and tax-relief still
              need Super Admin. Next of kin, address, and general requests can be
              cleared by HR.
            </p>
          </CardHeader>
          <CardContent>
            {pending.length === 0 ? (
              <p className="text-sm text-muted">Inbox clear.</p>
            ) : (
              <ul className="divide-y divide-line">
                {pending.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-start justify-between gap-3 py-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {r.employee.firstName} {r.employee.lastName} (
                        {r.employee.employeeCode}) ·{" "}
                        {r.type.replace(/_/g, " ")}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {r.company?.name ? `${r.company.name} · ` : ""}
                        {r.employee.department} ·{" "}
                        {new Date(r.createdAt).toLocaleString()}
                      </p>
                      <pre className="mt-2 overflow-x-auto rounded bg-sand px-2 py-1 text-xs text-ink-soft">
                        {JSON.stringify(r.payload, null, 2)}
                      </pre>
                      {r.note && (
                        <p className="mt-1 text-xs text-muted">
                          Note: {r.note}
                        </p>
                      )}
                    </div>
                    {role && canReviewChangeType(role, r.type) ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={busyId === r.id}
                          onClick={() => review(r.id, "approve")}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === r.id}
                          onClick={() => review(r.id, "reject")}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs font-medium text-amber-700">
                        {canApproveChanges
                          ? "Awaiting review"
                          : "Awaiting Super Admin"}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
