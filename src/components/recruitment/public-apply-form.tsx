"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JOB_BOARDS, JOB_BOARD_LABELS } from "@/lib/recruitment/boards";

export function PublicApplyForm({ listingId }: { listingId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/public/jobs/${listingId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
        email: form.get("email"),
        phone: form.get("phone") || null,
        resumeUrl: form.get("resumeUrl") || null,
        coverLetter: form.get("coverLetter") || null,
        source: form.get("source") || "CAREERS_PAGE",
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not send application");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <p className="rounded-lg border border-ok/30 bg-ok/5 px-4 py-3 text-sm text-ok">
        Application received. HR will review it.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" required className="mt-1" />
        </div>
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required className="mt-1" />
      </div>
      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" className="mt-1" />
      </div>
      <div>
        <Label htmlFor="resumeUrl">Resume URL (optional)</Label>
        <Input id="resumeUrl" name="resumeUrl" type="url" className="mt-1" />
      </div>
      <div>
        <Label htmlFor="source">Where did you see this role?</Label>
        <select
          id="source"
          name="source"
          className="mt-1 flex h-9 w-full rounded-md border border-stone-300 px-3 text-sm"
          defaultValue="CAREERS_PAGE"
        >
          {JOB_BOARDS.map((board) => (
            <option key={board} value={board}>
              {JOB_BOARD_LABELS[board]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="coverLetter">Cover note</Label>
        <textarea
          id="coverLetter"
          name="coverLetter"
          rows={4}
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        />
      </div>
      {error && <p className="text-sm text-signal">{error}</p>}
      <Button type="submit" variant="brand" disabled={busy}>
        {busy ? "Sending…" : "Apply"}
      </Button>
    </form>
  );
}
