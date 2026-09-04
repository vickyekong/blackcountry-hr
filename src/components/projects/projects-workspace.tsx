"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { employeeFullName, formatCurrency, formatDate } from "@/lib/utils";
import {
  PROJECT_STATUSES,
  TASK_PRIORITIES,
  TASK_PROGRESS,
  projectStatusLabel,
  taskPriorityLabel,
  taskProgressLabel,
} from "@/lib/projects/labels";

const MAX_BYTES = 900_000;

async function fileToDataUrl(file: File): Promise<string> {
  if (file.size > MAX_BYTES) {
    throw new Error("File is too large — keep PDFs and images under ~900KB");
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read file"));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

type Staff = {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
};

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string };
};

type Attachment = { id: string; name: string };

export type ProjectTask = {
  id: string;
  name: string;
  status: string;
  progress?: string;
  priority?: string;
  dueOn?: string | null;
  parentTaskId?: string | null;
  assignee?: Staff | null;
  comments?: Comment[];
  attachments?: Attachment[];
};

export type Project = {
  id: string;
  name: string;
  code: string | null;
  description?: string | null;
  status: string;
  startsOn?: string | null;
  dueOn?: string | null;
  budgetKobo?: string | number;
  manager?: Staff | null;
  members?: Array<{
    employeeId: string;
    plannedMinutesPerWeek: number;
    role: string;
    employee: Staff;
  }>;
  tasks: ProjectTask[];
};

const selectClass =
  "mt-1 flex h-9 w-full rounded-md border border-stone-300 px-3 text-sm";

export function ProjectsWorkspace({
  canManage,
  staffEmployeeId,
}: {
  canManage: boolean;
  staffEmployeeId?: string | null;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [managerEmployeeId, setManagerEmployeeId] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [budgetNaira, setBudgetNaira] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [taskLines, setTaskLines] = useState("");
  const [newTask, setNewTask] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [openTask, setOpenTask] = useState<string | null>(null);

  function load() {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []));
    if (canManage) {
      fetch("/api/employees")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setStaff(data);
        })
        .catch(() => undefined);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage]);

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
      body: JSON.stringify({
        name,
        code: code || null,
        description: description || null,
        managerEmployeeId: managerEmployeeId || null,
        startsOn: startsOn || null,
        dueOn: dueOn || null,
        budgetNaira: budgetNaira ? Number(budgetNaira) : 0,
        memberIds,
        tasks,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? "Could not create project");
      return;
    }
    setName("");
    setCode("");
    setDescription("");
    setManagerEmployeeId("");
    setStartsOn("");
    setDueOn("");
    setBudgetNaira("");
    setMemberIds([]);
    setTaskLines("");
    load();
  }

  async function patchProject(id: string, body: Record<string, unknown>) {
    setBusy(true);
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    load();
  }

  async function addTask(projectId: string, extra?: Record<string, unknown>) {
    const nameValue = (newTask[projectId] ?? "").trim();
    if (!nameValue && !extra?.name) return;
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: extra?.name ?? nameValue, ...extra }),
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

  async function patchTask(
    projectId: string,
    taskId: string,
    body: Record<string, unknown>
  ) {
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error ?? "Could not update task");
      return;
    }
    load();
  }

  async function comment(projectId: string, taskId: string, body: string) {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    await fetch(`/api/projects/${projectId}/tasks/${taskId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    setBusy(false);
    load();
  }

  async function attach(projectId: string, taskId: string, file: File) {
    setBusy(true);
    setMessage("");
    try {
      const fileUrl = await fileToDataUrl(file);
      const res = await fetch(
        `/api/projects/${projectId}/tasks/${taskId}/attachments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, fileUrl }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage(data.error ?? "Could not attach file");
      } else {
        load();
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not attach file");
    } finally {
      setBusy(false);
    }
  }

  async function openAttachment(
    projectId: string,
    taskId: string,
    attachmentId: string
  ) {
    const res = await fetch(
      `/api/projects/${projectId}/tasks/${taskId}/attachments/${attachmentId}`
    );
    const json = await res.json();
    if (!res.ok || !json.fileUrl) {
      setMessage(json.error ?? "Could not open attachment");
      return;
    }
    window.open(json.fileUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink">Projects</h1>
        <p className="mt-1 text-sm text-muted">
          {canManage
            ? "Plan work on the existing project catalog. Timesheets still log hours against active projects and tasks."
            : "Company projects and your assigned tasks. Log hours on Timesheets."}
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
              <div>
                <Label htmlFor="proj-manager">Project manager</Label>
                <select
                  id="proj-manager"
                  className={selectClass}
                  value={managerEmployeeId}
                  onChange={(e) => setManagerEmployeeId(e.target.value)}
                >
                  <option value="">None</option>
                  {staff.map((person) => (
                    <option key={person.id} value={person.id}>
                      {employeeFullName(person.firstName, person.lastName)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="proj-budget">Budget (₦)</Label>
                <Input
                  id="proj-budget"
                  type="number"
                  min={0}
                  value={budgetNaira}
                  onChange={(e) => setBudgetNaira(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="proj-start">Start</Label>
                <Input
                  id="proj-start"
                  type="date"
                  value={startsOn}
                  onChange={(e) => setStartsOn(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="proj-due">Deadline</Label>
                <Input
                  id="proj-due"
                  type="date"
                  value={dueOn}
                  onChange={(e) => setDueOn(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="proj-desc">Description</Label>
                <Input
                  id="proj-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="proj-team">Team</Label>
                <select
                  id="proj-team"
                  multiple
                  className="mt-1 min-h-[88px] w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                  value={memberIds}
                  onChange={(e) =>
                    setMemberIds(
                      Array.from(e.target.selectedOptions).map((o) => o.value)
                    )
                  }
                >
                  {staff.map((person) => (
                    <option key={person.id} value={person.id}>
                      {employeeFullName(person.firstName, person.lastName)} (
                      {person.employeeCode})
                    </option>
                  ))}
                </select>
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
                  Leave blank to start with a General task so timesheets still have somewhere to log.
                </p>
              </div>
              <div className="sm:col-span-2 flex items-center gap-3">
                <Button type="submit" variant="brand" disabled={busy}>
                  Add project
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {message ? (
        <p className="mb-4 text-sm text-signal">{message}</p>
      ) : null}

      <ul className="space-y-4">
        {projects.map((project) => {
          const activeTasks = project.tasks.filter((t) => t.status === "ACTIVE");
          const roots = activeTasks.filter((t) => !t.parentTaskId);
          return (
            <li
              key={project.id}
              className="rounded-lg border border-line bg-foam px-4 py-3"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-medium text-ink">{project.name}</p>
                  <p className="text-xs text-muted">
                    {project.code ? `${project.code} · ` : ""}
                    {projectStatusLabel(project.status)}
                    {project.manager
                      ? ` · ${employeeFullName(project.manager.firstName, project.manager.lastName)}`
                      : ""}
                    {project.dueOn ? ` · due ${formatDate(project.dueOn)}` : ""}
                    {project.budgetKobo
                      ? ` · ${formatCurrency(project.budgetKobo)}`
                      : ""}
                  </p>
                  {project.description ? (
                    <p className="mt-1 text-sm text-ink-soft">{project.description}</p>
                  ) : null}
                  {project.members?.length ? (
                    <div className="mt-2 space-y-1">
                      {project.members.map((m) => (
                        <p key={m.employeeId} className="text-xs text-muted">
                          {employeeFullName(
                            m.employee.firstName,
                            m.employee.lastName
                          )}
                          {m.role === "LEAD" ? " (lead)" : ""}
                          {canManage ? (
                            <>
                              {" · "}
                              <label>
                                {Math.round(m.plannedMinutesPerWeek / 60)}h/wk
                                <input
                                  type="number"
                                  min={0}
                                  max={60}
                                  defaultValue={Math.round(
                                    m.plannedMinutesPerWeek / 60
                                  )}
                                  className="ml-1 h-6 w-14 rounded border border-stone-300 px-1"
                                  onBlur={(e) => {
                                    const hours = Number(e.target.value || 0);
                                    void patchProject(project.id, {
                                      members: project.members?.map((row) => ({
                                        employeeId: row.employeeId,
                                        role: row.role,
                                        plannedMinutesPerWeek:
                                          row.employeeId === m.employeeId
                                            ? Math.round(hours * 60)
                                            : row.plannedMinutesPerWeek,
                                      })),
                                    });
                                  }}
                                />
                              </label>
                            </>
                          ) : m.plannedMinutesPerWeek ? (
                            ` · ${Math.round(m.plannedMinutesPerWeek / 60)}h/wk`
                          ) : null}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
                {canManage && (
                  <select
                    className="h-9 rounded-md border border-stone-300 px-2 text-sm"
                    value={project.status}
                    disabled={busy}
                    onChange={(e) =>
                      void patchProject(project.id, { status: e.target.value })
                    }
                  >
                    {PROJECT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {projectStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <ul className="mt-3 space-y-2">
                {roots.map((task) => {
                  const children = activeTasks.filter(
                    (t) => t.parentTaskId === task.id
                  );
                  const canProgress =
                    canManage ||
                    (staffEmployeeId && task.assignee?.id === staffEmployeeId);
                  return (
                    <li key={task.id} className="rounded-md border border-line bg-mist/40 p-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-sm text-ink">{task.name}</p>
                        <Badge>{taskPriorityLabel(task.priority ?? "MEDIUM")}</Badge>
                        {task.assignee ? (
                          <span className="text-xs text-muted">
                            {employeeFullName(
                              task.assignee.firstName,
                              task.assignee.lastName
                            )}
                          </span>
                        ) : null}
                        {task.dueOn ? (
                          <span className="text-xs text-muted">
                            due {formatDate(task.dueOn)}
                          </span>
                        ) : null}
                        {canProgress ? (
                          <select
                            className="h-8 rounded-md border border-stone-300 px-2 text-xs"
                            value={task.progress ?? "TODO"}
                            disabled={busy}
                            onChange={(e) =>
                              void patchTask(project.id, task.id, {
                                progress: e.target.value,
                              })
                            }
                          >
                            {TASK_PROGRESS.map((value) => (
                              <option key={value} value={value}>
                                {taskProgressLabel(value)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Badge>
                            {taskProgressLabel(task.progress ?? "TODO")}
                          </Badge>
                        )}
                        {canManage ? (
                          <button
                            type="button"
                            className="text-xs text-muted hover:text-signal"
                            onClick={() =>
                              void patchTask(project.id, task.id, {
                                status: "ARCHIVED",
                              })
                            }
                          >
                            Archive
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="text-xs text-muted hover:text-ink"
                          onClick={() =>
                            setOpenTask(openTask === task.id ? null : task.id)
                          }
                        >
                          {openTask === task.id ? "Hide" : "Details"}
                        </button>
                      </div>
                      {openTask === task.id ? (
                        <div className="mt-2 space-y-2 border-t border-line pt-2">
                          {canManage ? (
                            <div className="flex flex-wrap gap-2">
                              <select
                                className="h-8 rounded-md border border-stone-300 px-2 text-xs"
                                value={task.assignee?.id ?? ""}
                                onChange={(e) =>
                                  void patchTask(project.id, task.id, {
                                    assigneeEmployeeId: e.target.value || null,
                                  })
                                }
                              >
                                <option value="">Unassigned</option>
                                {(project.members ?? []).map((m) => (
                                  <option key={m.employeeId} value={m.employeeId}>
                                    {employeeFullName(
                                      m.employee.firstName,
                                      m.employee.lastName
                                    )}
                                  </option>
                                ))}
                              </select>
                              <select
                                className="h-8 rounded-md border border-stone-300 px-2 text-xs"
                                value={task.priority ?? "MEDIUM"}
                                onChange={(e) =>
                                  void patchTask(project.id, task.id, {
                                    priority: e.target.value,
                                  })
                                }
                              >
                                {TASK_PRIORITIES.map((value) => (
                                  <option key={value} value={value}>
                                    {taskPriorityLabel(value)}
                                  </option>
                                ))}
                              </select>
                              <Input
                                type="date"
                                className="h-8 w-auto"
                                defaultValue={task.dueOn?.slice(0, 10) ?? ""}
                                onBlur={(e) =>
                                  void patchTask(project.id, task.id, {
                                    dueOn: e.target.value || null,
                                  })
                                }
                              />
                            </div>
                          ) : null}
                          <ul className="space-y-1 text-xs text-ink-soft">
                            {(task.comments ?? []).map((row) => (
                              <li key={row.id}>
                                <span className="font-medium text-ink">
                                  {row.author.name}
                                </span>
                                : {row.body}
                              </li>
                            ))}
                          </ul>
                          <form
                            className="flex gap-2"
                            onSubmit={(e) => {
                              e.preventDefault();
                              const input = e.currentTarget.elements.namedItem(
                                "comment"
                              ) as HTMLInputElement;
                              void comment(project.id, task.id, input.value);
                              input.value = "";
                            }}
                          >
                            <Input name="comment" placeholder="Add a comment" className="h-8" />
                            <Button type="submit" size="sm" variant="outline" disabled={busy}>
                              Comment
                            </Button>
                          </form>
                          <div className="flex flex-wrap items-center gap-2">
                            {(task.attachments ?? []).map((file) => (
                              <button
                                key={file.id}
                                type="button"
                                className="text-xs text-sky underline"
                                onClick={() =>
                                  void openAttachment(project.id, task.id, file.id)
                                }
                              >
                                {file.name}
                              </button>
                            ))}
                            <label className="text-xs text-muted">
                              Attach
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                className="ml-2 text-xs"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) void attach(project.id, task.id, file);
                                  e.currentTarget.value = "";
                                }}
                              />
                            </label>
                          </div>
                          {canManage ? (
                            <form
                              className="flex gap-2"
                              onSubmit={(e) => {
                                e.preventDefault();
                                const input = e.currentTarget.elements.namedItem(
                                  "subtask"
                                ) as HTMLInputElement;
                                void addTask(project.id, {
                                  name: input.value,
                                  parentTaskId: task.id,
                                });
                                input.value = "";
                              }}
                            >
                              <Input name="subtask" placeholder="Subtask" className="h-8" />
                              <Button type="submit" size="sm" variant="outline" disabled={busy}>
                                Add subtask
                              </Button>
                            </form>
                          ) : null}
                          {children.length ? (
                            <ul className="ml-3 list-disc text-xs text-muted">
                              {children.map((child) => (
                                <li key={child.id}>
                                  {child.name} ·{" "}
                                  {taskProgressLabel(child.progress ?? "TODO")}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
                {roots.length === 0 && (
                  <li className="text-xs text-muted">No active tasks</li>
                )}
              </ul>
              {canManage && project.status !== "ARCHIVED" && (
                <form
                  className="mt-3 flex flex-wrap items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void addTask(project.id);
                  }}
                >
                  <Input
                    value={newTask[project.id] ?? ""}
                    onChange={(e) =>
                      setNewTask((prev) => ({
                        ...prev,
                        [project.id]: e.target.value,
                      }))
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
