"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InboxKind } from "@/lib/automation/playbooks";

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
          <CardTitle>Waiting on you</CardTitle>
          <p className="text-sm text-stone-500">
            Existing engines — leave, expenses, payroll, advances, loans,
            overtime, timesheets, and recruitment. Open the item to approve it
            there.
          </p>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {items.length === 0 && !error ? (
            <p className="text-sm text-stone-500">Inbox clear.</p>
          ) : (
            <ul className="divide-y divide-stone-100 rounded-md border border-stone-200">
              {items.map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                  <Link
                    href={item.href}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm hover:bg-stone-50"
                  >
                    <div>
                      <p className="font-medium text-stone-900">{item.title}</p>
                      <p className="text-xs text-stone-500">{item.subtitle}</p>
                    </div>
                    <span className="text-xs text-stone-500">
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
          <p className="text-sm text-stone-500">
            These paths are already in the product. Reminder timing is under
            Settings → Automation.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {playbooks.map((book) => (
            <div key={book.id} className="rounded-md border border-stone-200 p-3">
              <Link
                href={book.href}
                className="text-sm font-medium text-stone-900 hover:underline"
              >
                {book.title}
              </Link>
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-stone-500">
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
