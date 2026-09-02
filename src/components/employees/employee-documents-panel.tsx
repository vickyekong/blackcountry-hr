"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import {
  DOCUMENT_CATEGORIES,
  documentCategoryLabel,
} from "@/lib/people/labels";
import { expiryAlert } from "@/lib/people/expiry";

interface DocRow {
  id: string;
  name: string;
  fileUrl: string;
  uploadedAt: string;
  category?: string;
  expiresAt?: string | null;
}

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
      if (result.length > 1_200_000) {
        reject(new Error("Encoded file is too large — try a smaller PDF or image"));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export function EmployeeDocumentsPanel({
  employeeId,
  canManage = true,
}: {
  employeeId: string;
  canManage?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<(typeof DOCUMENT_CATEGORIES)[number]>("OTHER");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    fetch(`/api/employees/${employeeId}/documents`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setDocs(data);
      })
      .catch(() => undefined);
  }, [employeeId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setMessage("Choose a PDF or image first.");
      return;
    }
    const label = name.trim() || file.name.replace(/\.[^.]+$/, "");
    setLoading(true);
    setMessage("");
    try {
      const fileUrl = await fileToDataUrl(file);
      const res = await fetch(`/api/employees/${employeeId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: label,
          fileUrl,
          category,
          expiresAt: expiresAt || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setName("");
      setExpiresAt("");
      setCategory("OTHER");
      if (fileRef.current) fileRef.current.value = "";
      setMessage("Document saved.");
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  async function removeDoc(id: string) {
    if (!confirm("Remove this document?")) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/employees/${employeeId}/documents/${id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Delete failed");
      }
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
        <p className="text-sm text-stone-500">
          Contracts, IDs, and letters for this staff member. Keep files under
          ~900KB (PDF or image).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage && (
        <form
          onSubmit={(e) => void handleUpload(e)}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:items-end"
        >
          <div>
            <Label htmlFor="docName">Document name</Label>
            <Input
              id="docName"
              className="mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Employment contract"
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="docCategory">Type</Label>
            <select
              id="docCategory"
              className="mt-1 flex h-9 w-full rounded-md border border-stone-300 px-3 text-sm"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as (typeof DOCUMENT_CATEGORIES)[number])
              }
              disabled={loading}
            >
              {DOCUMENT_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {documentCategoryLabel(item)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="docExpires">Expiry (optional)</Label>
            <Input
              id="docExpires"
              type="date"
              className="mt-1"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="docFile">File</Label>
            <Input
              id="docFile"
              ref={fileRef}
              type="file"
              accept=".pdf,image/png,image/jpeg,image/webp,application/pdf"
              className="mt-1"
              disabled={loading}
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : "Upload"}
          </Button>
        </form>
        )}

        {message && (
          <p
            className={`text-sm ${
              message.includes("saved") ? "text-emerald-700" : "text-red-600"
            }`}
          >
            {message}
          </p>
        )}

        {docs.length === 0 ? (
          <p className="text-sm text-stone-500">No documents yet.</p>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-md border border-stone-200">
            {docs.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-stone-900">{doc.name}</p>
                  <p className="text-xs text-stone-500">
                    {documentCategoryLabel(doc.category ?? "OTHER")} · Uploaded{" "}
                    {formatDate(new Date(doc.uploadedAt))}
                    {doc.expiresAt
                      ? ` · expires ${formatDate(new Date(doc.expiresAt))}`
                      : ""}
                    {expiryAlert(doc.expiresAt ? new Date(doc.expiresAt) : null) ===
                    "expired"
                      ? " · expired"
                      : expiryAlert(
                            doc.expiresAt ? new Date(doc.expiresAt) : null
                          ) === "soon"
                        ? " · due soon"
                        : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={doc.name}
                    >
                      Open
                    </a>
                  </Button>
                  {canManage && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    onClick={() => void removeDoc(doc.id)}
                  >
                    Remove
                  </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
