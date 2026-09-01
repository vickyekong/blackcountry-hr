"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ProjectTask = { id: string; name: string; status: string };
export type Project = {
  id: string;
  name: string;
  code: string | null;
  status: string;
  tasks: ProjectTask[];
};

export function ProjectsWorkspace({ canManage }: { canManage: boolean }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [taskLines, setTaskLines] = useState("");
  const [newTask, setNewTask] = useState<Record<string, string>>({});
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
    const tasks = taskLines
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, code: code || null, tasks }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? "Could not create project");
      return;
    }
    setName("");
    setCode("");
    setTaskLines("");
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

  async function addTask(projectId: string) {
    const nameValue = (newTask[projectId] ?? "").trim();
    if (!nameValue) return;
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nameValue }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error ?? "Could not add task");
      return;
    }
    setNewTask((prev) => ({ ...prev, [projectId]: "" }));
    load();
  }

  async function archiveTask(projectId: string, taskId: string) {
    await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ARCHIVED" }),
    });
    load();
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink">Projects</h1>
        <p className="mt-1 text-sm text-muted">
          {canManage
            ? "Create projects and tasks for this company. Timesheets log hours against both."
            : "Company projects and tasks. Log hours against them on Timesheets."}
        </p>
      </div>

      {canManage && (
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
              <div className="sm:col-span-2">
                <Label htmlFor="proj-tasks">Tasks (one per line)</Label>
                <textarea
                  id="proj-tasks"
                  value={taskLines}
                  onChange={(e) => setTaskLines(e.target.value)}
                  className="mt-1 min-h-[88px] w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                  placeholder="General&#10;Site visit&#10;Design review"
                />
                <p className="mt-1 text-xs text-muted">
                  Leave blank to start with a General task.
                </p>
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
      )}

      {!canManage && message ? (
        <p className="mb-4 text-sm text-signal">{message}</p>
      ) : null}

      <ul className="space-y-3">
        {projects.map((p) => {
          const activeTasks = p.tasks.filter((t) => t.status === "ACTIVE");
          return (
            <li
              key={p.id}
              className="rounded-lg border border-line bg-foam px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">{p.name}</p>
                  <p className="text-xs text-muted">
                    {p.code ? `${p.code} · ` : ""}
                    {p.status}
                  </p>
                </div>
                {canManage && p.status === "ACTIVE" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void archive(p.id)}
                  >
                    Archive
                  </Button>
                )}
              </div>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {activeTasks.map((task) => (
                  <li
                    key={task.id}
                    className="inline-flex items-center gap-1 rounded-full border border-line bg-mist px-2 py-0.5 text-xs text-ink"
                  >
                    {task.name}
                    {canManage && (
                      <button
                        type="button"
                        className="text-muted hover:text-signal"
                        onClick={() => void archiveTask(p.id, task.id)}
                        aria-label={`Archive ${task.name}`}
                      >
                        ×
                      </button>
                    )}
                  </li>
                ))}
                {activeTasks.length === 0 && (
                  <li className="text-xs text-muted">No active tasks</li>
                )}
              </ul>
              {canManage && p.status === "ACTIVE" && (
                <form
                  className="mt-3 flex flex-wrap items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void addTask(p.id);
                  }}
                >
                  <Input
                    value={newTask[p.id] ?? ""}
                    onChange={(e) =>
                      setNewTask((prev) => ({ ...prev, [p.id]: e.target.value }))
                    }
                    placeholder="Add a task"
                    className="h-8 max-w-xs"
                  />
                  <Button type="submit" size="sm" variant="outline" disabled={busy}>
                    Add task
                  </Button>
                </form>
              )}
            </li>
          );
        })}
        {projects.length === 0 && (
          <li className="text-sm text-muted">No projects yet.</li>
        )}
      </ul>
    </>
  );
}
