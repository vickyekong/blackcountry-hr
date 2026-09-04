"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ScrollText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  changes: Record<string, unknown> | null;
  performedBy: {
    name: string;
    email: string;
    role: string;
  };
}

const ENTITY_TYPES = [
  "",
  "Employee",
  "PayrollRun",
  "PayrollAdjustment",
  "LeaveRequest",
  "ExpenseClaim",
  "StatutoryConfig",
  "HrDeskMessage",
  "WebhookEndpoint",
];

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [entityType, setEntityType] = useState("");
  const [exportMonth, setExportMonth] = useState(currentMonthValue);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [banner, setBanner] = useState("");

  const loadLogs = useCallback(
    (cursor?: string, append = false) => {
      setLoading(true);
      const params = new URLSearchParams({ limit: "50" });
      if (entityType) params.set("entityType", entityType);
      if (cursor) params.set("cursor", cursor);

      fetch(`/api/audit-logs?${params}`)
        .then((r) => r.json())
        .then((data) => {
          setLogs((prev) =>
            append ? [...prev, ...(data.logs ?? [])] : data.logs ?? []
          );
          setNextCursor(data.nextCursor);
          setHasMore(data.hasMore);
          setLoading(false);
        });
    },
    [entityType]
  );

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  function formatChanges(changes: Record<string, unknown> | null): string {
    if (!changes) return "—";
    const text = JSON.stringify(changes);
    return text.length > 80 ? `${text.slice(0, 80)}…` : text;
  }

  async function exportCsv() {
    setExporting(true);
    setBanner("");
    const params = new URLSearchParams({ month: exportMonth });
    if (entityType) params.set("entityType", entityType);
    const res = await fetch(`/api/audit-logs/export?${params}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setBanner(data.error ?? "Export failed");
      setExporting(false);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${exportMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
    setBanner(`Downloaded audit-log-${exportMonth}.csv`);
  }

  return (
    <AppShell>
      <PageHeader
        icon={ScrollText}
        title="Audit log"
        description="Immutable record of payroll and HR actions"
        actions={
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="entityFilter" className="text-xs text-muted">
              Filter by entity
            </Label>
            <select
              id="entityFilter"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="mt-1 flex h-9 rounded-md border border-line px-3 text-sm"
            >
              <option value="">All entities</option>
              {ENTITY_TYPES.filter(Boolean).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="exportMonth" className="text-xs text-muted">
              Export month
            </Label>
            <Input
              id="exportMonth"
              type="month"
              value={exportMonth}
              onChange={(e) => setExportMonth(e.target.value)}
              className="mt-1 h-9 w-[10.5rem]"
            />
          </div>
          <Button
            variant="outline"
            disabled={exporting}
            onClick={() => void exportCsv()}
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        </div>
        }
      />

      {banner && (
        <p className="mb-4 rounded-md bg-sand px-3 py-2 text-sm text-ink-soft">
          {banner}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-sm text-muted">
                    {formatDate(log.timestamp)}{" "}
                    {new Date(log.timestamp).toLocaleTimeString("en-NG", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{log.performedBy.name}</p>
                    <p className="text-xs text-muted">
                      {log.performedBy.role.replace("_", " ")}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">{log.action}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="text-muted">{log.entityType}</span>
                    <span className="mt-0.5 block truncate font-mono text-xs text-muted">
                      {log.entityId.slice(0, 12)}…
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted">
                    {formatChanges(log.changes)}
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted">
                    No audit entries yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {hasMore && (
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => nextCursor && loadLogs(nextCursor, true)}
              >
                {loading ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
