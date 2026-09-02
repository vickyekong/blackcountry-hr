"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { expiryAlert } from "@/lib/people/expiry";

type CertRow = {
  id: string;
  name: string;
  issuer: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  fileUrl: string | null;
};

export function EmployeeCertificationsPanel({
  employeeId,
  canManage,
}: {
  employeeId: string;
  canManage: boolean;
}) {
  const [rows, setRows] = useState<CertRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    fetch(`/api/employees/${employeeId}/certifications`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRows(data);
      })
      .catch(() => undefined);
  }, [employeeId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addCert(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    setMessage("");
    const res = await fetch(`/api/employees/${employeeId}/certifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        issuer: String(form.get("issuer") || "") || null,
        issuedAt: String(form.get("issuedAt") || "") || null,
        expiresAt: String(form.get("expiresAt") || "") || null,
        fileUrl: String(form.get("fileUrl") || "") || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error ?? "Could not save certification");
      return;
    }
    e.currentTarget.reset();
    load();
  }

  async function removeCert(id: string) {
    if (!confirm("Remove this certification?")) return;
    await fetch(`/api/employees/${employeeId}/certifications/${id}`, {
      method: "DELETE",
    });
    load();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Certifications</CardTitle>
        <p className="text-sm text-stone-500">
          Professional certificates with optional expiry. Omni Co-Pilot flags
          those due within 60 days.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage && (
          <form onSubmit={(e) => void addCert(e)} className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="certName">Name</Label>
              <Input id="certName" name="name" className="mt-1" required />
            </div>
            <div>
              <Label htmlFor="certIssuer">Issuer</Label>
              <Input id="certIssuer" name="issuer" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="certUrl">Document URL (optional)</Label>
              <Input id="certUrl" name="fileUrl" className="mt-1" placeholder="https://…" />
            </div>
            <div>
              <Label htmlFor="certIssued">Issued</Label>
              <Input id="certIssued" name="issuedAt" type="date" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="certExpires">Expires</Label>
              <Input id="certExpires" name="expiresAt" type="date" className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : "Add certification"}
              </Button>
            </div>
          </form>
        )}
        {message && <p className="text-sm text-red-600">{message}</p>}
        {rows.length === 0 ? (
          <p className="text-sm text-stone-500">No certifications recorded yet.</p>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-md border border-stone-200">
            {rows.map((row) => {
              const alert = expiryAlert(
                row.expiresAt ? new Date(row.expiresAt) : null
              );
              return (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 text-sm"
                >
                  <div>
                    <p className="font-medium text-stone-900">{row.name}</p>
                    <p className="text-xs text-stone-500">
                      {row.issuer ? `${row.issuer} · ` : ""}
                      {row.expiresAt
                        ? `Expires ${formatDate(row.expiresAt)}`
                        : "No expiry"}
                      {alert === "expired"
                        ? " · expired"
                        : alert === "soon"
                          ? " · due soon"
                          : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {row.fileUrl && (
                      <Button asChild variant="outline" size="sm">
                        <a href={row.fileUrl} target="_blank" rel="noopener noreferrer">
                          Open
                        </a>
                      </Button>
                    )}
                    {canManage && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void removeCert(row.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
