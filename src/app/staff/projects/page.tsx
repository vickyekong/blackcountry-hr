"use client";

import { useSession } from "next-auth/react";
import { AppShell } from "@/components/layout/app-shell";
import { ProjectsWorkspace } from "@/components/projects/projects-workspace";
import { WorkPlanningPanel } from "@/components/projects/work-planning-panel";
import { WorkSchedulePanel } from "@/components/projects/work-schedule-panel";

export default function StaffProjectsPage() {
  const { data } = useSession();
  return (
    <AppShell>
      <ProjectsWorkspace
        canManage={false}
        staffEmployeeId={data?.user?.employeeId}
      />
      <div className="mt-8">
        <WorkPlanningPanel />
      </div>
      <div className="mt-8">
        <WorkSchedulePanel />
      </div>
    </AppShell>
  );
}
