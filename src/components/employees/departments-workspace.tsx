"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { employeeFullName } from "@/lib/utils";

export type DepartmentRow = {
  id: string;
  name: string;
  managerEmployeeId?: string | null;
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
  } | null;
};

type StaffOption = {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
};

export function DepartmentsWorkspace({
  initialDepartments,
  canManage,
  onChange,
}: {
  initialDepartments: DepartmentRow[];
  canManage: boolean;
  onChange?: (items: DepartmentRow[]) => void;
}) {
  const [rows, setRows] = useState(initialDepartments);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setRows(initialDepartments);
  }, [initialDepartments]);

  useEffect(() => {
    fetch("/api/employees")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setStaff(
            data.map(
              (emp: {
                id: string;
                firstName: string;
                lastName: string;
                employeeCode: string;
              }) => ({
                id: emp.id,
                firstName: emp.firstName,
                lastName: emp.lastName,
                employeeCode: emp.employeeCode,
              })
            )
          );
        }
      })
      .catch(() => undefined);
  }, []);

  function publish(next: DepartmentRow[]) {
    setRows(next);
    onChange?.(next);
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add department");
      publish(
        [...rows, data].sort((a, b) => a.name.localeCompare(b.name))
      );
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add department");
    } finally {
      setLoading(false);
    }
  }

  async function saveEdit(id: string) {
    const trimmed = editName.trim();
    if (!trimmed) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/departments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update department");
      publish(
        rows
          .map((r) => (r.id === id ? { ...r, ...data } : r))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingId(null);
      setEditName("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update department"
      );
    } finally {
      setLoading(false);
    }
  }

  async function setHead(id: string, managerEmployeeId: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/departments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managerEmployeeId: managerEmployeeId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to set department head");
      const head = staff.find((s) => s.id === (data.managerEmployeeId ?? ""));
      publish(
        rows.map((r) =>
          r.id === id
            ? {
                ...r,
                ...data,
                manager: head
                  ? {
                      id: head.id,
                      firstName: head.firstName,
                      lastName: head.lastName,
                      employeeCode: head.employeeCode,
                    }
                  : null,
              }
            : r
        )
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to set department head"
      );
    } finally {
      setLoading(false);
    }
  }

  async function removeItem(id: string) {
    if (!confirm("Delete this department?")) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/departments/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to delete department");
      publish(rows.filter((r) => r.id !== id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete department"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-stone-900">Departments</h3>
        <p className="mt-1 text-sm text-stone-500">
          Company departments. Assign a head here; staff still pick the
          department name on their record.
        </p>
      </div>

      {canManage && (
        <form onSubmit={(e) => void addItem(e)} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[14rem] flex-1">
            <Label htmlFor="new-department">New department</Label>
            <Input
              id="new-department"
              className="mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. CRM"
              disabled={loading}
            />
          </div>
          <Button type="submit" disabled={loading || !name.trim()}>
            {loading ? "Saving…" : "Add department"}
          </Button>
        </form>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {rows.length === 0 ? (
        <p className="text-sm text-stone-500">No departments yet.</p>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-md border border-stone-200">
          {rows.map((row) => (
            <li key={row.id} className="space-y-2 px-3 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {editingId === row.id ? (
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="max-w-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void saveEdit(row.id)}
                    >
                      Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <p className="font-medium text-stone-900">{row.name}</p>
                )}
                {canManage && editingId !== row.id && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingId(row.id);
                        setEditName(row.name);
                      }}
                    >
                      Rename
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void removeItem(row.id)}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                <span>Head:</span>
                {canManage ? (
                  <select
                    className="h-8 rounded-md border border-stone-300 px-2 text-sm text-stone-800"
                    value={row.managerEmployeeId ?? row.manager?.id ?? ""}
                    disabled={loading}
                    onChange={(e) => void setHead(row.id, e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {staff.map((person) => (
                      <option key={person.id} value={person.id}>
                        {employeeFullName(person.firstName, person.lastName)} (
                        {person.employeeCode})
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-stone-800">
                    {row.manager
                      ? employeeFullName(
                          row.manager.firstName,
                          row.manager.lastName
                        )
                      : "Unassigned"}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
