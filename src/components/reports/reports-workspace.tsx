"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";
import { PayrollReportsPanel } from "@/components/reports/payroll-reports-panel";
import { PeopleAnalyticsPanel } from "@/components/reports/people-analytics-panel";
import { TimeAnalyticsPanel } from "@/components/reports/time-analytics-panel";
import { CostAnalyticsPanel } from "@/components/reports/cost-analytics-panel";

const TABS = [
  { id: "payroll", href: "/reports", label: "Payroll" },
  { id: "people", href: "/reports?tab=people", label: "People" },
  { id: "time", href: "/reports?tab=time", label: "Time" },
  { id: "costs", href: "/reports?tab=costs", label: "Costs" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function ReportsWorkspace() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: TabId = TABS.some((item) => item.id === tabParam)
    ? (tabParam as TabId)
    : "payroll";
  const [year, setYear] = useState(new Date().getFullYear());

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Reports</h1>
          <p className="mt-1 text-sm text-stone-500">
            Payroll snapshots, people movement, timesheets, and cost trends —
            not a replacement for the books.
          </p>
        </div>
        {tab !== "payroll" && (
          <label className="text-sm text-stone-600">
            Year{" "}
            <input
              type="number"
              className="ml-2 h-9 w-24 rounded-md border border-stone-300 px-2"
              value={year}
              onChange={(e) => setYear(Number(e.target.value) || year)}
            />
          </label>
        )}
      </div>

      <div className="mb-6 flex gap-2 border-b border-line">
        {TABS.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
              tab === item.id
                ? "border-ink text-ink"
                : "border-transparent text-muted hover:text-ink"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {tab === "people" ? (
        <PeopleAnalyticsPanel year={year} />
      ) : tab === "time" ? (
        <TimeAnalyticsPanel year={year} />
      ) : tab === "costs" ? (
        <CostAnalyticsPanel year={year} />
      ) : (
        <PayrollReportsPanel />
      )}
    </div>
  );
}
