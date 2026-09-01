"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Project = {
  id: string;
  name: string;
  code: string | null;
  status: string;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []));
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, code: code || null }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? "Could not create project");
      return;
    }
    setName("");
    setCode("");
    load();
  }

  async function archive(id: string) {
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ARCHIVED" }),
    });
    load();
  }

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink">Projects</h1>
        <p className="mt-1 text-sm text-muted">
          Company projects that timesheets post hours against. Belong to this
          company unless you are working from group HQ.
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>New project</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="proj-name">Name</Label>
              <Input
                id="proj-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
                required
                minLength={2}
              />
            </div>
            <div>
              <Label htmlFor="proj-code">Code (optional)</Label>
              <Input
                id="proj-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2 flex items-center gap-3">
              <Button type="submit" variant="brand" disabled={busy}>
                Add project
              </Button>
              {message && <p className="text-sm text-signal">{message}</p>}
            </div>
          </form>
        </CardContent>
      </Card>

      <ul className="space-y-2">
        {projects.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-lg border border-line bg-foam px-4 py-3"
          >
            <div>
              <p className="font-medium text-ink">{p.name}</p>
              <p className="text-xs text-muted">
                {p.code ? `${p.code} · ` : ""}
                {p.status}
              </p>
            </div>
            {p.status === "ACTIVE" && (
              <Button size="sm" variant="outline" onClick={() => void archive(p.id)}>
                Archive
              </Button>
            )}
          </li>
        ))}
        {projects.length === 0 && (
          <li className="text-sm text-muted">No projects yet.</li>
        )}
      </ul>
    </AppShell>
  );
}
