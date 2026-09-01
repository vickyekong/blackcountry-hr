"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateTemporaryPassword } from "@/lib/auth/temp-password";

export function StaffPortalCard({
  employeeId,
  portalEmail,
  suggestedEmail,
  employmentType,
}: {
  employeeId: string;
  portalEmail: string | null;
  suggestedEmail?: string | null;
  employmentType: string;
}) {
  const [email, setEmail] = useState(portalEmail ?? suggestedEmail ?? "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [enabled, setEnabled] = useState(Boolean(portalEmail));

  async function enable(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const res = await fetch(`/api/employees/${employeeId}/portal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not enable portal");
      return;
    }
    setEnabled(true);
    setPassword("");
    setMessage(
      portalEmail
        ? `Portal password updated for ${data.user?.email}`
        : `Staff portal enabled for ${data.user?.email}`
    );
  }

  async function disable() {
    if (!confirm("Remove this person's staff login?")) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/employees/${employeeId}/portal`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not disable portal");
      return;
    }
    setEnabled(false);
    setMessage("Staff portal login removed");
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Staff portal access</CardTitle>
        <p className="text-sm text-muted">
          {employmentType === "CONTRACT"
            ? "Contract staff do not get a login. HR can log timesheet hours for them. Issue a portal only for full-time staff."
            : "Give this full-time person a Staff login so they can fill their details, apply for leave, log timesheets, and send company requests."}
        </p>
      </CardHeader>
      <CardContent>
        {employmentType === "CONTRACT" ? (
          <p className="text-sm text-muted">No portal login for contract staff.</p>
        ) : (
          <>
            <form onSubmit={enable} className="grid max-w-lg gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="portalEmail">Login email</Label>
            <Input
              id="portalEmail"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="portalPassword">
              {enabled ? "New password" : "Temporary password"}
            </Label>
            <div className="mt-1 flex gap-2">
              <Input
                id="portalPassword"
                type="text"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setPassword(generateTemporaryPassword())}
              >
                Generate
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit" variant="brand" disabled={busy}>
              {busy
                ? "Saving…"
                : enabled
                  ? "Reset password"
                  : "Enable staff portal"}
            </Button>
            {enabled && (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={disable}
              >
                Remove login
              </Button>
            )}
          </div>
        </form>
            {error && <p className="mt-3 text-sm text-signal">{error}</p>}
            {message && <p className="mt-3 text-sm text-ok">{message}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
