"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SKILL_LEVELS, skillLevelLabel } from "@/lib/people/labels";

type SkillRow = {
  id: string;
  skillId: string;
  name: string;
  level: string;
};

type CatalogSkill = { id: string; name: string };

export function EmployeeSkillsPanel({
  employeeId,
  canManage,
}: {
  employeeId: string;
  canManage: boolean;
}) {
  const [rows, setRows] = useState<SkillRow[]>([]);
  const [catalog, setCatalog] = useState<CatalogSkill[]>([]);
  const [skillId, setSkillId] = useState("");
  const [newName, setNewName] = useState("");
  const [level, setLevel] = useState<(typeof SKILL_LEVELS)[number]>("INTERMEDIATE");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/employees/${employeeId}/skills`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRows(data);
      })
      .catch(() => undefined);
    fetch("/api/skills")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCatalog(data);
      })
      .catch(() => undefined);
  }, [employeeId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addSkill(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const res = await fetch(`/api/employees/${employeeId}/skills`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        skillId: skillId || undefined,
        name: newName.trim() || undefined,
        level,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error ?? "Could not save skill");
      return;
    }
    setSkillId("");
    setNewName("");
    load();
  }

  async function removeSkill(id: string) {
    if (!confirm("Remove this skill?")) return;
    await fetch(`/api/employees/${employeeId}/skills/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Skills</CardTitle>
        <p className="text-sm text-stone-500">
          Skills this person holds. Use the company catalog or add a new name.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage && (
          <form
            onSubmit={(e) => void addSkill(e)}
            className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end"
          >
            <div>
              <Label htmlFor="skillPick">Catalog</Label>
              <select
                id="skillPick"
                className="mt-1 flex h-9 w-full rounded-md border border-stone-300 px-3 text-sm"
                value={skillId}
                onChange={(e) => setSkillId(e.target.value)}
              >
                <option value="">Select…</option>
                {catalog.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="skillNew">Or new skill</Label>
              <Input
                id="skillNew"
                className="mt-1"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. AutoCAD"
              />
            </div>
            <div>
              <Label htmlFor="skillLevel">Level</Label>
              <select
                id="skillLevel"
                className="mt-1 flex h-9 w-full rounded-md border border-stone-300 px-3 text-sm"
                value={level}
                onChange={(e) =>
                  setLevel(e.target.value as (typeof SKILL_LEVELS)[number])
                }
              >
                {SKILL_LEVELS.map((item) => (
                  <option key={item} value={item}>
                    {skillLevelLabel(item)}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : "Add"}
            </Button>
          </form>
        )}
        {message && <p className="text-sm text-red-600">{message}</p>}
        {rows.length === 0 ? (
          <p className="text-sm text-stone-500">No skills recorded yet.</p>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-md border border-stone-200">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 text-sm"
              >
                <div>
                  <p className="font-medium text-stone-900">{row.name}</p>
                  <p className="text-xs text-stone-500">{skillLevelLabel(row.level)}</p>
                </div>
                {canManage && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void removeSkill(row.id)}
                  >
                    Remove
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-stone-500">
          Company skill catalog lives under{" "}
          <Link href="/employees?tab=skills" className="underline">
            Employees → Skills
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  );
}
