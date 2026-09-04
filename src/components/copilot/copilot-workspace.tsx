"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CopilotAnswer } from "@/lib/copilot/types";

type Turn = {
  question: string;
  answer: CopilotAnswer;
};

export function CopilotWorkspace() {
  const [question, setQuestion] = useState("");
  const [prompts, setPrompts] = useState<string[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/copilot")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.prompts)) setPrompts(data.prompts);
      })
      .catch(() => undefined);
  }, []);

  async function ask(text: string) {
    const q = text.trim();
    if (q.length < 3) return;
    setBusy(true);
    setError("");
    setQuestion("");
    const res = await fetch("/api/copilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not answer");
      return;
    }
    setTurns((prev) => [...prev, { question: q, answer: data.answer }]);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ask Omni Co-Pilot</CardTitle>
          <p className="text-sm text-muted">
            Answers come from this company&apos;s live records — reports,
            timesheets, payroll simulate, and performance KPIs. Nothing here
            changes pay on its own.
          </p>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              void ask(question);
            }}
          >
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Who has not submitted their timesheet?"
              maxLength={500}
              disabled={busy}
            />
            <Button type="submit" disabled={busy}>
              {busy ? "Looking…" : "Ask"}
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-signal">{error}</p>}
          {prompts.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="rounded-lg border border-line bg-foam px-3 py-1.5 text-left text-xs text-ink hover:border-ok/40 hover:bg-ok/10"
                  onClick={() => void ask(prompt)}
                  disabled={busy}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {turns.length === 0 ? (
        <p className="text-sm text-muted">
          Pick a question above. Payroll-confidential asks stay with HR and
          Super Admin.
        </p>
      ) : (
        <ul className="space-y-4">
          {turns
            .slice()
            .reverse()
            .map((turn, i) => (
              <li key={`${turn.question}-${i}`}>
                <Card>
                  <CardHeader>
                    <p className="text-xs uppercase tracking-wide text-muted">
                      You asked
                    </p>
                    <p className="text-sm font-medium text-ink">{turn.question}</p>
                    <CardTitle className="pt-2">{turn.answer.title}</CardTitle>
                    <p className="text-sm text-muted">{turn.answer.body}</p>
                  </CardHeader>
                  {turn.answer.rows.length > 0 && (
                    <CardContent>
                      <ul className="divide-y divide-line rounded-md border border-line">
                        {turn.answer.rows.map((row) => (
                          <li
                            key={`${row.label}-${row.detail}`}
                            className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-sm"
                          >
                            <span className="text-ink">{row.label}</span>
                            <span className="text-muted">{row.detail}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  )}
                  {turn.answer.href && (
                    <CardContent className="pt-0">
                      <Link
                        href={turn.answer.href}
                        className="text-sm font-medium text-ok hover:text-ok-deep"
                      >
                        Open the source page →
                      </Link>
                    </CardContent>
                  )}
                </Card>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
