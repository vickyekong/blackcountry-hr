"use client";

import { DashboardViewProvider, useDashboardView } from "@/components/layout/dashboard-view-context";
import { DashboardModulesView } from "@/components/layout/dashboard-modules-view";
import { DesktopSidebar, MobileNav } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";

function AppMain({ children }: { children: React.ReactNode }) {
  const { open } = useDashboardView();

  return (
    <main className="flex-1 overflow-x-hidden overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl animate-fade-in px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
        {open ? <DashboardModulesView /> : children}
      </div>
    </main>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <DashboardViewProvider>
      <div className="flex min-h-screen min-h-dvh bg-atmosphere">
        <DesktopSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileNav />
          <TopBar />
          <AppMain>{children}</AppMain>
        </div>
      </div>
    </DashboardViewProvider>
  );
}
