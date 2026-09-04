"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/cn";

type CompanyOption = {
  id: string;
  name: string;
  isHome: boolean;
  isGroup: boolean;
  depth?: number;
};

export function WorkspaceSwitcher({
  className,
}: {
  className?: string;
}) {
  const { data: session, update } = useSession();
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [activeId, setActiveId] = useState(session?.user?.companyId ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/workspace/companies")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.companies) return;
        setCompanies(data.companies);
        setActiveId(data.activeCompanyId ?? session?.user?.companyId ?? "");
      })
      .catch(() => undefined);
  }, [session?.user?.companyId]);

  if (companies.length <= 1) return null;

  async function switchTo(id: string) {
    if (id === activeId) return;
    setBusy(true);
    await update({ activeCompanyId: id });
    setActiveId(id);
    setBusy(false);
    window.location.reload();
  }

  return (
    <div className={cn("min-w-0", className)}>
      <label className="sr-only" htmlFor="workspace-switcher">
        Company
      </label>
      <select
        id="workspace-switcher"
        value={activeId}
        disabled={busy}
        onChange={(e) => void switchTo(e.target.value)}
        className="h-9 max-w-full truncate rounded-md border border-line bg-foam px-2.5 text-xs font-medium text-ink"
      >
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {`${"\u00a0\u00a0".repeat(c.depth ?? 0)}${c.name}${
              c.isGroup ? " (group)" : ""
            }${c.isHome ? " · home" : ""}`}
          </option>
        ))}
      </select>
    </div>
  );
}
