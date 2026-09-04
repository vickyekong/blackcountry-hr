"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InboxKind } from "@/lib/automation/playbooks";
import { IconLabel } from "@/components/ui/icon-label";
import {
  CalendarDays,
  Receipt,
  Wallet,
  Send,
  HandCoins,
  Landmark,
  Timer,
  Clock,
  UserPlus,
  Inbox,
} from "lucide-react";

type Item = {
  id: string;
  kind: InboxKind;
  title: string;
  subtitle: string;
  href: string;
  createdAt: string;
};

type Playbook = {
  id: string;
  title: string;
  href: string;
  steps: readonly string[];
};

const KIND_ICONS: Record<InboxKind, typeof CalendarDays> = {
  leave: CalendarDays,
  expense: Receipt,
  payroll: Wallet,
  change: Send,
  advance: HandCoins,
  loan: Landmark,
  overtime: Timer,
  timesheet: Clock,
  recruitment: UserPlus,
};

const KIND_LABEL: Record<InboxKind, string> = {
  leave: "Leave",
  expense: "Expense",
  payroll: "Payroll",
  change: "Change request",
  advance: "Advance",
  loan: "Loan",
  overtime: "Overtime",
  timesheet: "Timesheet",
  recruitment: "Recruitment",
};

export function ApprovalsInbox() {
  const [items, setItems] = useState<Item[]>([]);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/approvals")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setItems(Array.isArray(data.items) ? data.items : []);
        setPlaybooks(Array.isArray(data.playbooks) ? data.playbooks : []);
      })
      .catch(() => setError("Could not load approvals"));
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <IconLabel icon={Inbox}>Waiting on you</IconLabel>
          </CardTitle>
          <p className="text-sm text-muted">
            Existing engines — leave, expenses, payroll, advances, loans,
            overtime, timesheets, and recruitment. Open the item to approve it
            there.
          </p>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {items.length === 0 && !error ? (
            <p className="text-sm text-muted">Inbox clear.</p>
          ) : (
            <ul className="divide-y divide-line rounded-md border border-line">
              {items.map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                  <Link
                    href={item.href}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm hover:bg-sand"
                  >
                    <div className="flex min-w-0 items-start gap-2.5">
                      {(() => {
                        const KindIcon = KIND_ICONS[item.kind];
                        return (
                          <KindIcon
                            className="mt-0.5 h-4 w-4 shrink-0 text-ink/70"
                            strokeWidth={1.75}
                          />
                        );
                      })()}
                      <div>
                        <p className="font-medium text-ink">{item.title}</p>
                        <p className="text-xs text-muted">{item.subtitle}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted">
                      {KIND_LABEL[item.kind]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How work is approved</CardTitle>
          <p className="text-sm text-muted">
            These paths are already in the product. Reminder timing is under
            Settings → Automation.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {playbooks.map((book) => (
            <div key={book.id} className="rounded-md border border-line p-3">
              <Link
                href={book.href}
                className="text-sm font-medium text-ink hover:underline"
              >
                {book.title}
              </Link>
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-muted">
                {book.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
