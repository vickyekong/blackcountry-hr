"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StaffOption = {
  id: string;
  firstName: string;
  lastName: string;
  employmentType: string;
};

type FileRow = {
  id: string;
  name: string;
  fileUrl: string;
  folder: string;
  visibility: string;
  grants?: Array<{
    employeeId: string;
    employee?: { firstName: string; lastName: string };
  }>;
};

function grantLabel(file: FileRow) {
  if (file.visibility !== "SPECIFIC") {
    return file.visibility.replace(/_/g, " ").toLowerCase();
  }
  const names = (file.grants ?? [])
    .map((g) =>
      g.employee ? `${g.employee.firstName} ${g.employee.lastName}` : null
    )
    .filter(Boolean);
  return names.length ? `specific: ${names.join(", ")}` : "specific: nobody yet";
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [name, setName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [folder, setFolder] = useState("general");
  const [visibility, setVisibility] = useState("EDITORS");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/files")
      .then((r) => r.json())
      .then((data) => setFiles(Array.isArray(data) ? data : []));
    fetch("/api/employees")
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        setStaff(
          data.filter((e: StaffOption) => e.employmentType === "FULL_TIME")
        );
      });
  }

  useEffect(() => {
    load();
  }, []);

  function togglePerson(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        fileUrl,
        folder,
        visibility,
        employeeIds: visibility === "SPECIFIC" ? selectedIds : undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? "Could not add file");
      return;
    }
    setName("");
    setFileUrl("");
    setSelectedIds([]);
    load();
  }

  async function saveGrants(file: FileRow) {
    setBusy(true);
    setMessage("");
    const res = await fetch(`/api/files/${file.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visibility: "SPECIFIC",
        employeeIds: selectedIds,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? "Could not update who can view this file");
      return;
    }
    setEditingId(null);
    setSelectedIds([]);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Remove this file from the company library?")) return;
    await fetch(`/api/files/${id}`, { method: "DELETE" });
    load();
  }

  const fullTime = staff;

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink">Files</h1>
        <p className="mt-1 text-sm text-muted">
          Company library for this employer. Super Admin, HR, and the business
          head can edit. Full-time staff can view files marked for them.
          Paste a SharePoint or Drive https link — each sub-company keeps its
          own library.
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add a file</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="file-name">Name</Label>
              <Input
                id="file-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="file-folder">Folder</Label>
              <Input
                id="file-folder"
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="file-url">Link (https SharePoint / Drive URL)</Label>
              <Input
                id="file-url"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                className="mt-1"
                required
                placeholder="https://"
              />
            </div>
            <div>
              <Label htmlFor="file-vis">Who can view</Label>
              <select
                id="file-vis"
                value={visibility}
                onChange={(e) => {
                  setVisibility(e.target.value);
                  if (e.target.value !== "SPECIFIC") setSelectedIds([]);
                }}
                className="mt-1 flex h-9 w-full rounded-md border border-stone-300 px-3 text-sm"
              >
                <option value="EDITORS">Editors only</option>
                <option value="ALL_FULL_TIME">All full-time staff</option>
                <option value="SPECIFIC">Specific people</option>
              </select>
            </div>
            {visibility === "SPECIFIC" && (
              <div className="sm:col-span-2 max-h-40 overflow-y-auto rounded-md border border-line p-3">
                <p className="mb-2 text-xs text-muted">
                  Full-time staff who may view this file
                </p>
                {fullTime.length === 0 && (
                  <p className="text-sm text-muted">No full-time staff yet.</p>
                )}
                {fullTime.map((person) => (
                  <label
                    key={person.id}
                    className="flex items-center gap-2 py-1 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(person.id)}
                      onChange={() => togglePerson(person.id)}
                    />
                    {person.firstName} {person.lastName}
                  </label>
                ))}
              </div>
            )}
            <div className="sm:col-span-2 flex items-center gap-3">
              <Button type="submit" variant="brand" disabled={busy}>
                Add file
              </Button>
              {message && <p className="text-sm text-signal">{message}</p>}
            </div>
          </form>
        </CardContent>
      </Card>

      <ul className="space-y-2">
        {files.map((f) => (
          <li
            key={f.id}
            className="rounded-lg border border-line bg-foam px-4 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <a
                  href={f.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-ink hover:underline"
                >
                  {f.name}
                </a>
                <p className="text-xs text-muted">
                  {f.folder} · {grantLabel(f)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingId(editingId === f.id ? null : f.id);
                    setSelectedIds(
                      (f.grants ?? []).map((g) => g.employeeId)
                    );
                  }}
                >
                  People
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void remove(f.id)}
                >
                  Remove
                </Button>
              </div>
            </div>
            {editingId === f.id && (
              <div className="mt-3 border-t border-line pt-3">
                <p className="mb-2 text-xs text-muted">
                  Choose full-time staff who can view this file
                </p>
                {fullTime.map((person) => (
                  <label
                    key={person.id}
                    className="flex items-center gap-2 py-1 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(person.id)}
                      onChange={() => togglePerson(person.id)}
                    />
                    {person.firstName} {person.lastName}
                  </label>
                ))}
                <Button
                  size="sm"
                  className="mt-2"
                  variant="brand"
                  disabled={busy}
                  onClick={() => void saveGrants(f)}
                >
                  Save who can view
                </Button>
              </div>
            )}
          </li>
        ))}
        {files.length === 0 && (
          <li className="text-sm text-muted">No files in this company yet.</li>
        )}
      </ul>
    </AppShell>
  );
}
