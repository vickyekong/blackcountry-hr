"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JOB_BOARDS, JOB_BOARD_LABELS } from "@/lib/recruitment/boards";
import {
  PIPELINE_COLUMNS,
  applicationStatusLabel,
} from "@/lib/talent/labels";

type Application = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  resumeUrl: string | null;
  coverLetter: string | null;
  notes: string | null;
  interviewAt: string | null;
  source: string;
  status: string;
  hiredEmployeeId: string | null;
  createdAt: string;
  skillMatch?: { percent: number; matched: string[]; missing: string[] };
};

type ListingDetail = {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  description: string;
  requirements: string | null;
  status: string;
  applyUrl: string;
  viewCount: number;
  applicationCount: number;
  applications: Application[];
  posts: Array<{
    board: string;
    status: string;
    postedAt: string | null;
    externalUrl: string | null;
  }>;
  performance: {
    views: number;
    applications: number;
    conversionPercent: number;
  };
  bySource: Array<{ source: string; label: string; count: number }>;
};

export function ListingWorkspace({ listingId }: { listingId: string }) {
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");

  const load = useCallback(() => {
    fetch(`/api/recruitment/listings/${listingId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setListing(data);
      });
  }, [listingId]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(status: string) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/recruitment/listings/${listingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not update listing");
      return;
    }
    load();
  }

  async function postBoard(board: (typeof JOB_BOARDS)[number]) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/recruitment/listings/${listingId}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ board, markPosted: true }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not post");
      return;
    }
    if (data.share?.url) {
      window.open(data.share.url, "_blank", "noopener,noreferrer");
    }
    if (listing?.applyUrl) {
      await navigator.clipboard.writeText(listing.applyUrl).catch(() => {});
      setCopied(data.share?.instructions ?? "Apply URL copied");
    }
    load();
  }

  async function setAppStatus(id: string, status: string) {
    setBusy(true);
    const res = await fetch(`/api/recruitment/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not update application");
      return;
    }
    load();
  }

  if (!listing) {
    return <p className="text-sm text-muted">{error || "Loading…"}</p>;
  }

  const hireHref = (app: Application) => {
    const q = new URLSearchParams({
      applicationId: app.id,
      firstName: app.firstName,
      lastName: app.lastName,
      email: app.email,
      jobTitle: listing.title,
      department: listing.department,
      employmentType: listing.employmentType,
    });
    return `/employees/new?${q.toString()}`;
  };

  return (
    <div>
      {error && <p className="mb-4 text-sm text-signal">{error}</p>}
      {copied && <p className="mb-4 text-sm text-ok">{copied}</p>}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">
            {listing.department} · {listing.location}
          </p>
          <h1 className="text-2xl font-semibold text-ink">{listing.title}</h1>
          <Badge className="mt-2">{listing.status.replace(/_/g, " ")}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {listing.status === "DRAFT" && (
            <Button
              variant="brand"
              disabled={busy}
              onClick={() => void setStatus("OPEN")}
            >
              Open listing
            </Button>
          )}
          {listing.status === "OPEN" && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void setStatus("CLOSED")}
            >
              Close
            </Button>
          )}
        </div>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase text-muted">Views</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {listing.performance.views}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase text-muted">Applied</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {listing.performance.applications}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase text-muted">Apply rate</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {listing.performance.conversionPercent}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Post to job boards</CardTitle>
          <p className="text-sm text-muted">
            Opens the board and copies the apply URL. Mark as posted so
            application sources stay attributed.
          </p>
        </CardHeader>
        <CardContent>
          <p className="mb-3 break-all text-sm">
            Apply URL:{" "}
            <a href={listing.applyUrl} className="text-ok underline" target="_blank">
              {listing.applyUrl}
            </a>
          </p>
          <div className="flex flex-wrap gap-2">
            {JOB_BOARDS.map((board) => {
              const posted = listing.posts.find((p) => p.board === board);
              return (
                <Button
                  key={board}
                  type="button"
                  size="sm"
                  variant={posted?.status === "POSTED" ? "outline" : "brand"}
                  disabled={busy || listing.status !== "OPEN"}
                  onClick={() => void postBoard(board)}
                >
                  {posted?.status === "POSTED" ? "Posted · " : "Post to "}
                  {JOB_BOARD_LABELS[board]}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {listing.bySource.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Applications by source</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {listing.bySource.map((row) => (
                <li key={row.source} className="flex justify-between">
                  <span>{row.label}</span>
                  <span className="tabular-nums">{row.count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Hiring pipeline</CardTitle>
          <p className="text-sm text-muted">
            Move candidates through screening, interview, assessment, and offer.
            Hiring does not close the listing until all openings are filled.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {listing.applications.length === 0 ? (
            <p className="text-sm text-muted">No applications yet.</p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-4">
              {PIPELINE_COLUMNS.map((column) => {
                const apps = listing.applications.filter(
                  (app) => app.status === column.id
                );
                return (
                  <section
                    key={column.id}
                    className="rounded-lg border border-line bg-white p-3"
                  >
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      {column.label} · {apps.length}
                    </h3>
                    <ul className="space-y-2">
                      {apps.map((app) => (
                        <li
                          key={app.id}
                          className="rounded-md border border-line px-2 py-2 text-sm"
                        >
                          <p className="font-medium text-ink">
                            {app.firstName} {app.lastName}
                          </p>
                          {typeof app.skillMatch?.percent === "number" &&
                            app.skillMatch.percent > 0 && (
                              <p className="text-xs text-muted">
                                Skill match {app.skillMatch.percent}%
                                {app.skillMatch.missing.length > 0
                                  ? ` · missing ${app.skillMatch.missing.join(", ")}`
                                  : ""}
                              </p>
                            )}
                          <select
                            className="mt-2 h-8 w-full rounded-md border border-line px-2 text-xs"
                            value={app.status}
                            disabled={busy}
                            onChange={(e) =>
                              void setAppStatus(app.id, e.target.value)
                            }
                          >
                            {PIPELINE_COLUMNS.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label}
                              </option>
                            ))}
                            <option value="REJECTED">Rejected</option>
                          </select>
                          {app.status !== "HIRED" && (
                            <Button asChild size="sm" variant="brand" className="mt-2 w-full">
                              <Link href={hireHref(app)}>Create staff profile</Link>
                            </Button>
                          )}
                          {app.hiredEmployeeId && (
                            <Button asChild size="sm" variant="outline" className="mt-2 w-full">
                              <Link href={`/employees/${app.hiredEmployeeId}`}>
                                Open staff record
                              </Link>
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}

          {listing.applications.map((app) => (
            <div
              key={`detail-${app.id}`}
              className="rounded-lg border border-line px-4 py-3 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-ink">
                    {app.firstName} {app.lastName}
                  </p>
                  <p className="text-muted">
                    {app.email}
                    {app.phone ? ` · ${app.phone}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    Via {JOB_BOARD_LABELS[app.source as keyof typeof JOB_BOARD_LABELS] ?? app.source}{" "}
                    · {applicationStatusLabel(app.status)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {app.resumeUrl && (
                    <Button asChild size="sm" variant="outline">
                      <a href={app.resumeUrl} target="_blank" rel="noreferrer">
                        Resume
                      </a>
                    </Button>
                  )}
                </div>
              </div>
              {app.coverLetter && (
                <p className="mt-2 whitespace-pre-wrap text-muted">{app.coverLetter}</p>
              )}
              <form
                className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]"
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const notes = String(
                    (form.elements.namedItem("notes") as HTMLTextAreaElement)
                      .value || ""
                  );
                  void fetch(`/api/recruitment/applications/${app.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ notes }),
                  }).then(() => load());
                }}
              >
                <textarea
                  name="notes"
                  defaultValue={app.notes ?? ""}
                  rows={2}
                  placeholder="Interview notes — assistive only, never auto-hire"
                  className="w-full rounded-md border border-line px-3 py-2 text-sm"
                />
                <Button type="submit" size="sm" variant="outline" disabled={busy}>
                  Save notes
                </Button>
              </form>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
