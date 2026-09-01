"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CompanyRow = {
  id: string;
  name: string;
  parentId: string | null;
  depth: number;
  address?: string | null;
};

export function GroupCompaniesForm() {
  const [isGroup, setIsGroup] = useState(false);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [groupId, setGroupId] = useState("");
  const [parentId, setParentId] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function load() {
    fetch("/api/workspace/subsidiaries")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setIsGroup(Boolean(data?.isGroup));
        const tree = Array.isArray(data?.companies)
          ? (data.companies as CompanyRow[])
          : [];
        setCompanies(tree);
        const nextGroupId = data?.group?.id ?? tree[0]?.id ?? "";
        setGroupId(nextGroupId);
        setParentId((current) => current || nextGroupId);
      })
      .catch(() => undefined);
  }

  useEffect(() => {
    load();
  }, []);

  if (!isGroup) return null;

  const nested = companies.filter((c) => c.id !== groupId);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/workspace/subsidiaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        address: address || null,
        parentCompanyId: parentId || groupId,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error ?? "Could not add sub-company");
      return;
    }
    setName("");
    setAddress("");
    setMessage(`Added ${data.company?.name}. Switch into it from the sidebar.`);
    load();
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Sub-companies</CardTitle>
        <p className="text-sm text-muted">
          Each sub-company is a separate legal employer — own staff, payroll, and
          files. Engineering can hold its own sub-companies (Design, Interiors,
          Construction, Machinery, Automation). Group Super Admin and HR can
          switch into any of them.
        </p>
      </CardHeader>
      <CardContent>
        {nested.length === 0 ? (
          <p className="mb-4 text-sm text-muted">No sub-companies yet.</p>
        ) : (
          <ul className="mb-4 space-y-1 text-sm text-ink">
            {nested.map((s) => (
              <li
                key={s.id}
                style={{ paddingLeft: `${Math.max(s.depth - 1, 0) * 12}px` }}
              >
                {s.name}
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="sub-parent">Under</Label>
            <select
              id="sub-parent"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="mt-1 flex h-9 w-full rounded-md border border-stone-300 px-3 text-sm text-ink"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {`${"\u00a0\u00a0".repeat(c.depth)}${c.name}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="sub-name">Sub-company name</Label>
            <Input
              id="sub-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
              required
              minLength={2}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="sub-address">Address (optional)</Label>
            <Input
              id="sub-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <Button type="submit" variant="brand" disabled={loading}>
              {loading ? "Adding…" : "Add sub-company"}
            </Button>
            {message && <p className="text-sm text-muted">{message}</p>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
