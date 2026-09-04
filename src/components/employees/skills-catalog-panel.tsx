"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type SkillCatalogItem = {
  id: string;
  name: string;
  employeeCount?: number;
};

export function SkillsCatalogPanel({
  items,
  canManage,
  onChange,
}: {
  items: SkillCatalogItem[];
  canManage: boolean;
  onChange?: (items: SkillCatalogItem[]) => void;
}) {
  const [rows, setRows] = useState(items);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function publish(next: SkillCatalogItem[]) {
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
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add skill");
      publish([...rows, data].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add skill");
    } finally {
      setLoading(false);
    }
  }

  async function removeItem(id: string) {
    if (!confirm("Delete this skill?")) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/skills/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to delete skill");
      publish(rows.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete skill");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-ink">
          Skills catalog
        </h3>
        <p className="mt-1 text-sm text-muted">
          Company skills. Assign levels on each employee record.
        </p>
      </div>
      {canManage && (
        <form onSubmit={(e) => void addItem(e)} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[14rem] flex-1">
            <Label htmlFor="new-skill">New skill</Label>
            <Input
              id="new-skill"
              className="mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Welding"
              disabled={loading}
            />
          </div>
          <Button type="submit" disabled={loading || !name.trim()}>
            {loading ? "Saving…" : "Add skill"}
          </Button>
        </form>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {rows.length === 0 ? (
        <p className="text-sm text-muted">No skills in the catalog yet.</p>
      ) : (
        <ul className="divide-y divide-line rounded-md border border-line">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 text-sm"
            >
              <div>
                <p className="font-medium text-ink">{row.name}</p>
                {typeof row.employeeCount === "number" && (
                  <p className="text-xs text-muted">
                    {row.employeeCount}{" "}
                    {row.employeeCount === 1 ? "person" : "people"}
                  </p>
                )}
              </div>
              {canManage && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={() => void removeItem(row.id)}
                >
                  Delete
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
