"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";
import { PerformanceGoalsPanel } from "@/components/talent/performance-goals-panel";
import { PerformanceReviewsPanel } from "@/components/talent/performance-reviews-panel";
import { PerformanceRecognitionPanel } from "@/components/talent/performance-recognition-panel";
import { PageHeader } from "@/components/layout/page-header";
import { Target, ClipboardCheck, Award } from "lucide-react";

const TABS = [
  { id: "goals", href: "/performance", label: "Goals", icon: Target },
  { id: "reviews", href: "/performance?tab=reviews", label: "Reviews", icon: ClipboardCheck },
  { id: "recognition", href: "/performance?tab=recognition", label: "Recognition", icon: Award },
] as const;

type TabId = (typeof TABS)[number]["id"];

function PerformanceBody({ canManage }: { canManage: boolean }) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: TabId = TABS.some((item) => item.id === tabParam)
    ? (tabParam as TabId)
    : "goals";
  const [year, setYear] = useState(new Date().getFullYear());

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Target}
        title="Performance"
        description="Company, department, and individual goals with KPI achievement. Appraisals and recognition sit here — they do not change payroll."
        actions={
          <label className="text-sm text-muted">
            Year{" "}
            <input
              type="number"
              className="ml-2 h-9 w-24 rounded-md border border-line px-2"
              value={year}
              onChange={(e) => setYear(Number(e.target.value) || year)}
            />
          </label>
        }
      />

      <div className="flex gap-2 border-b border-line">
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

      {tab === "reviews" ? (
        <PerformanceReviewsPanel year={year} />
      ) : tab === "recognition" ? (
        <PerformanceRecognitionPanel year={year} />
      ) : (
        <PerformanceGoalsPanel year={year} canManage={canManage} />
      )}
    </div>
  );
}

export function PerformanceWorkspace({ canManage }: { canManage: boolean }) {
  return (
    <Suspense>
      <PerformanceBody canManage={canManage} />
    </Suspense>
  );
}
