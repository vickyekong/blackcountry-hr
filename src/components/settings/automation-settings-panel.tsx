"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AUTOMATION_ALERT_KEYS,
  DEFAULT_AUTOMATION_SETTINGS,
  WORKFLOW_PLAYBOOKS,
  type AutomationAlertKey,
  type AutomationSettingsInput,
} from "@/lib/automation/playbooks";

const ALERT_LABELS: Record<AutomationAlertKey, string> = {
  expiry: "Document, certification, and contract expiry",
  timesheets: "Missing timesheets (weekly)",
  reviews: "Open annual reviews (weekly)",
  approvals: "Pending approvals digest (weekly)",
  payroll: "Payroll reminder if no run this month",
  compliance: "Missing TIN and monthly workforce report",
};

export function AutomationSettingsPanel() {
  const [settings, setSettings] = useState<AutomationSettingsInput>(
    DEFAULT_AUTOMATION_SETTINGS
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/automation/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data?.expiryLeadDays) setSettings(data);
      })
      .catch(() => undefined);
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/automation/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? "Could not save");
      return;
    }
    setSettings(data);
    setMessage("Saved. Scheduled jobs use these leads on the next run.");
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Automation</CardTitle>
        <p className="text-sm text-stone-500">
          Reminder timing for the existing approval paths. Jobs write in-app
          notifications — they do not change payroll, leave, or expenses on
          their own.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => void save(e)} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="expiryLeadDays">Expiry lead (days)</Label>
              <Input
                id="expiryLeadDays"
                type="number"
                min={1}
                max={365}
                className="mt-1"
                value={settings.expiryLeadDays}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    expiryLeadDays: Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="reviewLeadDays">Review reminder (days)</Label>
              <Input
                id="reviewLeadDays"
                type="number"
                min={1}
                max={90}
                className="mt-1"
                value={settings.reviewLeadDays}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    reviewLeadDays: Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="payrollReminderDay">Payroll reminder day</Label>
              <Input
                id="payrollReminderDay"
                type="number"
                min={1}
                max={28}
                className="mt-1"
                value={settings.payrollReminderDay}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    payrollReminderDay: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-stone-700">
              Scheduled alerts
            </legend>
            {AUTOMATION_ALERT_KEYS.map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.alerts[key]}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      alerts: { ...settings.alerts, [key]: e.target.checked },
                    })
                  }
                />
                {ALERT_LABELS[key]}
              </label>
            ))}
          </fieldset>

          <div className="rounded-md border border-stone-200 p-3 text-xs text-stone-500">
            <p className="font-medium text-stone-700">Existing paths</p>
            <p className="mt-1">
              {WORKFLOW_PLAYBOOKS.map((p) => p.title).join(" · ")}
            </p>
          </div>

          <Button type="submit" disabled={busy}>
            Save automation
          </Button>
          {message && <p className="text-sm text-stone-600">{message}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
