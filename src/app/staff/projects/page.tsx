"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ProjectsWorkspace } from "@/components/projects/projects-workspace";

export default function StaffProjectsPage() {
  return (
    <AppShell>
      <ProjectsWorkspace canManage={false} />
    </AppShell>
  );
}
