"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ProjectsWorkspace } from "@/components/projects/projects-workspace";
import { WorkPlanningPanel } from "@/components/projects/work-planning-panel";
import { WorkSchedulePanel } from "@/components/projects/work-schedule-panel";
import { cn } from "@/lib/cn";

function ProjectsBody() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab =
    tabParam === "planning" || tabParam === "schedule" ? tabParam : "projects";

  return (
    <>
      <div className="mb-4 flex gap-2 border-b border-line">
        {(
          [
            { id: "projects", href: "/projects", label: "Projects" },
            { id: "planning", href: "/projects?tab=planning", label: "Workload" },
            { id: "schedule", href: "/projects?tab=schedule", label: "Schedule" },
          ] as const
        ).map((item) => (
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
      {tab === "planning" ? (
        <WorkPlanningPanel />
      ) : tab === "schedule" ? (
        <WorkSchedulePanel />
      ) : (
        <ProjectsWorkspace canManage />
      )}
    </>
  );
}

export default function ProjectsPage() {
  return (
    <AppShell>
      <Suspense>
        <ProjectsBody />
      </Suspense>
    </AppShell>
  );
}
