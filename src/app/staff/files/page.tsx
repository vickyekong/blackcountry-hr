"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";

type FileRow = {
  id: string;
  name: string;
  fileUrl: string;
  folder: string;
};

export default function StaffFilesPage() {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/files")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setFiles(data);
        else setError(data.error ?? "Could not load files");
      })
      .catch(() => setError("Could not load files"));
  }, []);

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink">Files</h1>
        <p className="mt-1 text-sm text-muted">
          Documents your company has shared with full-time staff. View or
          download — you cannot edit them here.
        </p>
      </div>
      {error && <p className="mb-4 text-sm text-signal">{error}</p>}
      <ul className="space-y-2">
        {files.map((f) => (
          <li
            key={f.id}
            className="rounded-lg border border-line bg-foam px-4 py-3"
          >
            <a
              href={f.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-ink hover:underline"
            >
              {f.name}
            </a>
            <p className="text-xs text-muted">{f.folder}</p>
          </li>
        ))}
        {files.length === 0 && !error && (
          <li className="text-sm text-muted">No files shared with you yet.</li>
        )}
      </ul>
    </AppShell>
  );
}
