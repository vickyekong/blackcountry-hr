"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WEBHOOK_EVENTS, type WebhookEvent } from "@/lib/integrations/events";

type CatalogItem = {
  id: string;
  title: string;
  status: "live" | "via_webhook" | "planned";
  href: string;
  note: string;
};

type WebhookRow = {
  id: string;
  name: string;
  url: string;
  secretSuffix: string;
  events: WebhookEvent[];
  enabled: boolean;
  lastStatus: number | null;
  lastError: string;
  lastFiredAt: string | null;
};

const STATUS_LABEL = {
  live: "Live",
  via_webhook: "Use a webhook",
  planned: "Not wired",
};

export function IntegrationsHub() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [google, setGoogle] = useState(false);
  const [microsoft, setMicrosoft] = useState(false);
  const [name, setName] = useState("Slack / Teams / accounting");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<WebhookEvent[]>([
    "payroll.submitted",
    "payroll.paid",
  ]);
  const [newSecret, setNewSecret] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/integrations")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.catalog)) setCatalog(data.catalog);
        if (Array.isArray(data.webhooks)) setWebhooks(data.webhooks);
        setGoogle(Boolean(data.connections?.google));
        setMicrosoft(Boolean(data.connections?.microsoft));
      })
      .catch(() => undefined);
  }

  useEffect(() => {
    load();
  }, []);

  function toggleEvent(event: WebhookEvent) {
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((item) => item !== event) : [...prev, event]
    );
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setNewSecret("");
    const res = await fetch("/api/integrations/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, url, events }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? "Could not save webhook");
      return;
    }
    setNewSecret(data.secret ?? "");
    setUrl("");
    load();
    setMessage("Saved. Copy the signing secret now — it is not shown again.");
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(true);
    const res = await fetch(`/api/integrations/webhooks?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? "Update failed");
      return;
    }
    if (body.ping) {
      setMessage(
        data.lastStatus
          ? `Ping HTTP ${data.lastStatus}${data.lastError ? ` — ${data.lastError}` : ""}`
          : data.lastError || "Ping sent"
      );
    }
    load();
  }

  async function remove(id: string) {
    if (!confirm("Remove this webhook?")) return;
    setBusy(true);
    await fetch(`/api/integrations/webhooks?id=${id}`, { method: "DELETE" });
    setBusy(false);
    load();
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
        <p className="text-sm text-muted">
          Existing Google, Microsoft, clock CSV, cron, and audit stay as they
          are. Slack, Teams, accounting, and payments attach through signed
          outbound webhooks — not a second payroll engine.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <ul className="grid gap-3 sm:grid-cols-2">
          {catalog.map((item) => (
            <li
              key={item.id}
              className="rounded-md border border-line px-3 py-2.5 text-sm"
            >
              <div className="flex items-baseline justify-between gap-2">
                <Link href={item.href} className="font-medium text-ink hover:underline">
                  {item.title}
                </Link>
                <span className="text-xs text-muted">
                  {item.id === "google-workspace" && google
                    ? "Connected"
                    : item.id === "microsoft-365" && microsoft
                      ? "Connected"
                      : STATUS_LABEL[item.status]}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">{item.note}</p>
            </li>
          ))}
        </ul>

        <form onSubmit={(e) => void create(e)} className="space-y-3 rounded-md border border-line p-3">
          <p className="text-sm font-medium text-ink">Outbound webhook</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="hook-name">Name</Label>
              <Input
                id="hook-name"
                className="mt-1"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="hook-url">HTTPS URL</Label>
              <Input
                id="hook-url"
                className="mt-1"
                placeholder="https://hooks.slack.com/services/…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          </div>
          <fieldset className="flex flex-wrap gap-x-3 gap-y-1">
            <legend className="mb-1 text-xs text-muted">Events</legend>
            {WEBHOOK_EVENTS.filter((event) => event !== "webhook.ping").map(
              (event) => (
                <label key={event} className="flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={events.includes(event)}
                    onChange={() => toggleEvent(event)}
                  />
                  {event}
                </label>
              )
            )}
          </fieldset>
          <Button type="submit" disabled={busy || events.length === 0}>
            Add webhook
          </Button>
          {newSecret && (
            <p className="break-all rounded-md bg-mist px-3 py-2 text-xs text-ink">
              Signing secret (copy now): {newSecret}
            </p>
          )}
        </form>

        {webhooks.length > 0 && (
          <ul className="space-y-2">
            {webhooks.map((row) => (
              <li
                key={row.id}
                className="rounded-md border border-line px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-ink">
                    {row.name}
                    {!row.enabled && (
                      <span className="ml-2 text-xs font-normal text-muted">
                        paused
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => void patch(row.id, { ping: true })}
                    >
                      Ping
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        void patch(row.id, { enabled: !row.enabled })
                      }
                    >
                      {row.enabled ? "Pause" : "Resume"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => void remove(row.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
                <p className="mt-1 break-all text-xs text-muted">{row.url}</p>
                <p className="text-xs text-muted">
                  {row.events.join(", ")} · secret …{row.secretSuffix}
                  {row.lastStatus != null && ` · last HTTP ${row.lastStatus}`}
                </p>
              </li>
            ))}
          </ul>
        )}
        {message && <p className="text-sm text-muted">{message}</p>}
      </CardContent>
    </Card>
  );
}
