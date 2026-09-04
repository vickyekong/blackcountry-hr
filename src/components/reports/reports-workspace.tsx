"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";
import { PayrollReportsPanel } from "@/components/reports/payroll-reports-panel";
import { PeopleAnalyticsPanel } from "@/components/reports/people-analytics-panel";
import { TimeAnalyticsPanel } from "@/components/reports/time-analytics-panel";
import { CostAnalyticsPanel } from "@/components/reports/cost-analytics-panel";
import { PageHeader } from "@/components/layout/page-header";
import { BarChart3, Wallet, Users, Clock, Coins } from "lucide-react";

const TABS = [
  { id: "payroll", href: "/reports", label: "Payroll", icon: Wallet },
  { id: "people", href: "/reports?tab=people", label: "People", icon: Users },
  { id: "time", href: "/reports?tab=time", label: "Time", icon: Clock },
  { id: "costs", href: "/reports?tab=costs", label: "Costs", icon: Coins },
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
      <PageHeader
        icon={BarChart3}
        title="Reports"
        description="Payroll snapshots, people movement, timesheets, and cost trends — not a replacement for the books."
        actions={
          tab !== "payroll" ? (
            <label className="text-sm text-muted">
              Year{" "}
              <input
                type="number"
                className="ml-2 h-9 w-24 rounded-md border border-line px-2"
                value={year}
                onChange={(e) => setYear(Number(e.target.value) || year)}
              />
            </label>
          ) : undefined
        }
      />

      <div className="mb-6 flex gap-2 border-b border-line">
        {TABS.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium",
              tab === item.id
                ? "border-ink text-ink"
                : "border-transparent text-muted hover:text-ink"
            )}
          >
            <item.icon className="h-3.5 w-3.5" strokeWidth={1.75} />
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
