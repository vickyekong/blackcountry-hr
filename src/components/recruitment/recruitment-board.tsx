"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Listing = {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  status: string;
  viewCount: number;
  applicationCount: number;
  applyUrl: string;
};

function statusVariant(status: string) {
  if (status === "OPEN") return "success" as const;
  if (status === "FILLED") return "info" as const;
  if (status === "CLOSED") return "default" as const;
  return "warning" as const;
}

export function RecruitmentBoard() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>(
    []
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/recruitment/listings")
      .then((r) => r.json())
      .then((data) => setListings(Array.isArray(data) ? data : []));
    fetch("/api/departments")
      .then((r) => r.json())
      .then((data) => setDepartments(Array.isArray(data) ? data : []));
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/recruitment/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        department: form.get("department"),
        location: form.get("location") || "Nigeria",
        employmentType: form.get("employmentType"),
        description: form.get("description"),
        requirements: form.get("requirements") || null,
        status: form.get("publish") === "on" ? "OPEN" : "DRAFT",
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create listing");
      return;
    }
    e.currentTarget.reset();
    router.push(`/recruitment/${data.id}`);
  }

  return (
    <div>
      {error && <p className="mb-4 text-sm text-signal">{error}</p>}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>New job listing</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="title">Role title</Label>
              <Input id="title" name="title" required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <select
                id="department"
                name="department"
                required
                className="mt-1 flex h-9 w-full rounded-md border border-stone-300 px-3 text-sm"
              >
                <option value="">Select</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" defaultValue="Nigeria" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="employmentType">Employment type</Label>
              <select
                id="employmentType"
                name="employmentType"
                className="mt-1 flex h-9 w-full rounded-md border border-stone-300 px-3 text-sm"
                defaultValue="FULL_TIME"
              >
                <option value="FULL_TIME">Full-time</option>
                <option value="CONTRACT">Contract</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="description">Listing copy</Label>
              <textarea
                id="description"
                name="description"
                required
                minLength={10}
                rows={5}
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="requirements">Requirements (optional)</Label>
              <textarea
                id="requirements"
                name="requirements"
                rows={3}
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="publish" />
              Open now on the careers apply page
            </label>
            <div>
              <Button type="submit" variant="brand" disabled={busy}>
                {busy ? "Saving…" : "Create listing"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-line bg-foam">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Applied</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {listings.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Link href={`/recruitment/${row.id}`} className="font-medium text-ok">
                    {row.title}
                  </Link>
                  <p className="text-xs text-muted">{row.location}</p>
                </TableCell>
                <TableCell>{row.department}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(row.status)}>
                    {row.status.replace(/_/g, " ")}
                  </Badge>
                </TableCell>
                <TableCell>{row.viewCount}</TableCell>
                <TableCell>{row.applicationCount}</TableCell>
                <TableCell className="text-right">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/recruitment/${row.id}`}>Open</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {listings.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted">
                  No listings yet. Create one above.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
