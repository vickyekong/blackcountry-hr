"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Send } from "lucide-react";

interface StaffRequest {
  id: string;
  type: string;
  status: string;
  payload: Record<string, string>;
  note: string | null;
  reviewNote: string | null;
  createdAt: string;
}

const REQUEST_TYPES = [
  { value: "GENERAL", label: "General company request" },
  { value: "BANK", label: "Bank details change" },
  { value: "TAX_RELIEF", label: "TIN / rent relief" },
  { value: "NEXT_OF_KIN", label: "Next of kin" },
  { value: "ADDRESS", label: "Home address" },
] as const;

export default function StaffRequestsPage() {
  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<(typeof REQUEST_TYPES)[number]["value"]>(
    "GENERAL"
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    fetch("/api/staff/requests")
      .then((r) => r.json())
      .then((data) => setRequests(Array.isArray(data) ? data : []));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const form = new FormData(e.currentTarget);
    let payload: Record<string, unknown> = {};
    if (type === "GENERAL") {
      payload = {
        subject: form.get("subject"),
        message: form.get("message"),
      };
    } else if (type === "BANK") {
      payload = {
        bankName: form.get("bankName"),
        bankAccountNumber: form.get("bankAccountNumber"),
      };
    } else if (type === "TAX_RELIEF") {
      payload = {
        tin: form.get("tin"),
        annualRentNaira: form.get("annualRentNaira"),
      };
    } else if (type === "NEXT_OF_KIN") {
      payload = {
        nextOfKinName: form.get("nextOfKinName"),
        nextOfKinPhone: form.get("nextOfKinPhone"),
      };
    } else {
      payload = { addressLine: form.get("addressLine") };
    }

    const res = await fetch("/api/staff/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        payload,
        note: form.get("note") || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Could not submit request");
      return;
    }
    setShowForm(false);
    load();
  }

  return (
    <AppShell>
      <PageHeader
        icon={Send}
        title="Company requests"
        description="Ask HR for letters, bank or tax updates, and other company help. Bank and tax-relief changes still need Super Admin clearance."
        actions={
          <Button onClick={() => setShowForm(!showForm)} variant="brand">
            {showForm ? "Close" : "New request"}
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6 max-w-lg">
          <CardHeader>
            <CardTitle>New request</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  value={type}
                  onChange={(e) =>
                    setType(e.target.value as typeof type)
                  }
                  className="mt-1 flex h-9 w-full rounded-lg border border-line bg-foam px-3 text-sm"
                >
                  {REQUEST_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              {type === "GENERAL" && (
                <>
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input id="subject" name="subject" required className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="message">What do you need?</Label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={4}
                      className="mt-1 flex w-full rounded-lg border border-line bg-foam px-3 py-2 text-sm text-ink"
                    />
                  </div>
                </>
              )}
              {type === "BANK" && (
                <>
                  <div>
                    <Label htmlFor="bankName">Bank name</Label>
                    <Input id="bankName" name="bankName" required className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="bankAccountNumber">10-digit account</Label>
                    <Input
                      id="bankAccountNumber"
                      name="bankAccountNumber"
                      required
                      className="mt-1"
                    />
                  </div>
                </>
              )}
              {type === "TAX_RELIEF" && (
                <>
                  <div>
                    <Label htmlFor="tin">TIN</Label>
                    <Input id="tin" name="tin" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="annualRentNaira">Annual rent (₦)</Label>
                    <Input
                      id="annualRentNaira"
                      name="annualRentNaira"
                      type="number"
                      min={0}
                      className="mt-1"
                    />
                  </div>
                </>
              )}
              {type === "NEXT_OF_KIN" && (
                <>
                  <div>
                    <Label htmlFor="nextOfKinName">Name</Label>
                    <Input
                      id="nextOfKinName"
                      name="nextOfKinName"
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nextOfKinPhone">Phone</Label>
                    <Input
                      id="nextOfKinPhone"
                      name="nextOfKinPhone"
                      required
                      className="mt-1"
                    />
                  </div>
                </>
              )}
              {type === "ADDRESS" && (
                <div>
                  <Label htmlFor="addressLine">Full residential address</Label>
                  <Input
                    id="addressLine"
                    name="addressLine"
                    required
                    className="mt-1"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="note">Note to HR (optional)</Label>
                <Input id="note" name="note" className="mt-1" />
              </div>
              {error && <p className="text-sm text-signal">{error}</p>}
              <Button type="submit" variant="brand" disabled={saving}>
                {saving ? "Submitting…" : "Submit for review"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <ul className="space-y-3">
        {requests.length === 0 && (
          <li className="rounded-xl border border-line/80 bg-foam/95 px-4 py-8 text-center text-sm text-muted">
            No company requests yet.
          </li>
        )}
        {requests.map((r) => (
          <li
            key={r.id}
            className="rounded-xl border border-line/80 bg-foam/95 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-ink">
                  {r.type.replace(/_/g, " ")}
                </p>
                <p className="text-xs text-muted">{formatDate(r.createdAt)}</p>
              </div>
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
            </div>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-mist px-3 py-2 text-xs text-ink">
              {JSON.stringify(r.payload, null, 2)}
            </pre>
            {r.note && (
              <p className="mt-2 text-xs text-muted">Your note: {r.note}</p>
            )}
            {r.reviewNote && (
              <p className="mt-2 text-xs text-ink">Review: {r.reviewNote}</p>
            )}
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
