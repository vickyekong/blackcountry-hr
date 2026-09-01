"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type CompanyOption = {
  id: string;
  name: string;
  isHome: boolean;
  isGroup: boolean;
};

export function WorkspaceSwitcher() {
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
    <div className="px-3 pb-2">
      <label className="sr-only" htmlFor="workspace-switcher">
        Company
      </label>
      <select
        id="workspace-switcher"
        value={activeId}
        disabled={busy}
        onChange={(e) => void switchTo(e.target.value)}
        className="w-full rounded-lg border border-white/15 bg-white/5 px-2.5 py-2 text-xs text-foam"
      >
        {companies.map((c) => (
          <option key={c.id} value={c.id} className="text-ink">
            {c.name}
            {c.isGroup ? " (group)" : ""}
            {c.isHome ? " · home" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
