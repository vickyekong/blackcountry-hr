"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ROLE_OPTIONS = [
  { value: "HR_ADMIN", label: "HR" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "FINANCE", label: "Finance" },
  { value: "BUSINESS_HEAD", label: "Business head" },
] as const;

type InviteRole = (typeof ROLE_OPTIONS)[number]["value"];

export function TeamInviteForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<InviteRole>("HR_ADMIN");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error ?? "Invite failed");
      return;
    }
    const label = ROLE_OPTIONS.find((o) => o.value === role)?.label ?? role;
    setMessage(
      `Invited ${data.user?.name} (${data.user?.email}) as ${label}. Share the password securely.`
    );
    setName("");
    setEmail("");
    setPassword("");
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Invite team</CardTitle>
        <p className="text-sm text-muted">
          Super Admin only — create HR, Finance, a business head, or another Super
          Admin for the company you are in.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="invite-name">Name</Label>
            <Input
              id="invite-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
              required
              minLength={2}
            />
          </div>
          <div>
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="invite-password">Temporary password</Label>
            <Input
              id="invite-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1"
              required
              minLength={8}
            />
          </div>
          <div>
            <Label htmlFor="invite-role">Role</Label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as InviteRole)}
              className="mt-1 flex h-9 w-full rounded-md border border-stone-300 px-3 text-sm"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <Button type="submit" variant="brand" disabled={loading}>
              {loading ? "Inviting…" : "Invite"}
            </Button>
            {message && (
              <p
                className={`text-sm ${
                  message.startsWith("Invited") ? "text-muted" : "text-signal"
                }`}
              >
                {message}
              </p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
