"use client";

import { signOut, useSession } from "next-auth/react";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { portalEyebrow } from "@/components/layout/nav-config";
import { effectivePortalRole, portalLabel } from "@/lib/permissions";

export function TopBar() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const portal = role ? effectivePortalRole(role) : null;

  return (
    <header className="sticky top-0 z-30 hidden h-14 items-center gap-3 border-b border-line bg-foam/90 px-5 backdrop-blur-md lg:flex">
      <span className="inline-flex h-6 items-center rounded-md bg-lagoon px-2 text-[11px] font-bold uppercase tracking-[0.08em] text-ink">
        {portalEyebrow(portal)}
      </span>
      <WorkspaceSwitcher className="max-w-[16rem]" />
      <div className="ml-auto flex items-center gap-3">
        <NotificationsBell />
        <div className="hidden min-w-0 text-right xl:block">
          <p className="truncate text-sm font-semibold text-ink">
            {session?.user?.name}
          </p>
          <p className="truncate text-[11px] text-muted">
            {role ? portalLabel(role) : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-xs font-medium text-muted transition hover:text-ink"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
