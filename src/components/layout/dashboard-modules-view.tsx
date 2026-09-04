"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/cn";
import { SectionIcon } from "@/components/ui/icon-label";
import { useDashboardView } from "@/components/layout/dashboard-view-context";
import {
  NAV_BLURBS,
  NAV_GROUP_ICONS,
  NAV_GROUP_TONE,
  isNavActive,
  navSectionsFor,
} from "@/components/layout/nav-config";

export function DashboardModulesView() {
  const { open, close } = useDashboardView();
  const { data: session } = useSession();
  const pathname = usePathname();
  const sections = navSectionsFor(session?.user?.role);

  if (!open) return null;

  return (
    <div className="min-h-full">
      <div className="mb-6">
        <p className="page-kicker">Dashboard</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
          All sections
        </h1>
        <p className="mt-1 max-w-xl text-sm text-muted">
          Everything on the left rail for this seat. Open a tile to go there,
          or click Dashboard again to return to the page you were on.
        </p>
      </div>

      <div className="space-y-8">
        {sections.map((section) => {
          const GroupIcon = NAV_GROUP_ICONS[section.group];
          return (
            <section key={section.group}>
              <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                <GroupIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
                {section.label}
              </p>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {section.items.map((item) => {
                  const active = isNavActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={close}
                        className={cn(
                          "flex h-full gap-3 rounded-lg border bg-foam p-4 shadow-panel transition hover:border-ink/20 hover:bg-sand",
                          active ? "border-ink/30 ring-1 ring-lagoon" : "border-line"
                        )}
                      >
                        <SectionIcon
                          icon={item.icon}
                          size="sm"
                          tone={NAV_GROUP_TONE[section.group]}
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-ink">
                            {item.label}
                          </span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                            {NAV_BLURBS[item.href] ?? "Open this section"}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
