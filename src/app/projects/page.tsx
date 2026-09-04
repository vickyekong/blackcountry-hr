"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ProjectsWorkspace } from "@/components/projects/projects-workspace";
import { WorkPlanningPanel } from "@/components/projects/work-planning-panel";
import { cn } from "@/lib/cn";

function ProjectsBody() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "planning" ? "planning" : "projects";

  return (
    <>
      <div className="mb-4 flex gap-2 border-b border-line">
        <Link
          href="/projects"
          className={cn(
            "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
            tab === "projects"
              ? "border-ink text-ink"
              : "border-transparent text-muted hover:text-ink"
          )}
        >
          Projects
        </Link>
        <Link
          href="/projects?tab=planning"
          className={cn(
            "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
            tab === "planning"
              ? "border-ink text-ink"
              : "border-transparent text-muted hover:text-ink"
          )}
        >
          Workload
        </Link>
      </div>
      {tab === "planning" ? (
        <WorkPlanningPanel />
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
