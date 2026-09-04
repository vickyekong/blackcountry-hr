"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/cn";
import { PRODUCT_NAME } from "@/lib/brand";
import { useCompanyBrand } from "@/components/brand/company-brand-provider";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { DashboardToggle } from "@/components/layout/dashboard-toggle";
import { useDashboardView } from "@/components/layout/dashboard-view-context";
import { effectivePortalRole } from "@/lib/permissions";
import { BrandStripe } from "@/components/brand/brand-stripe";
import {
  NAV_GROUP_DOT,
  NAV_GROUP_ICONS,
  isNavActive,
  navSectionsFor,
  portalEyebrow,
} from "@/components/layout/nav-config";

function NavPanel({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { brand } = useCompanyBrand();
  const { close } = useDashboardView();
  const role = session?.user?.role;
  const sections = navSectionsFor(role);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-rail text-foam">
      <BrandStripe />
      <div className="border-b border-white/10 px-4 py-5">
        <div className="flex items-center gap-3">
          {brand?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logoUrl}
              alt=""
              className="h-9 w-9 shrink-0 rounded-md bg-white/10 object-contain p-0.5"
            />
          ) : (
            <span
              aria-hidden
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-lagoon text-sm font-black text-ink"
            >
              B
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold leading-tight tracking-tight text-foam">
              {PRODUCT_NAME}
            </p>
            {brand?.name ? (
              <p className="mt-0.5 truncate text-[11px] text-white/50">
                {brand.name}
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-4">
          <DashboardToggle variant="rail" />
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {sections.map((section) => {
          const GroupIcon = NAV_GROUP_ICONS[section.group];
          return (
          <div key={section.group}>
            <p className="mb-1.5 flex items-center gap-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
              <span
                aria-hidden
                className={cn("h-1.5 w-1.5 shrink-0 rounded-sm", NAV_GROUP_DOT[section.group])}
              />
              <GroupIcon className="h-3 w-3" strokeWidth={2} />
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isNavActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      close();
                      onNavigate?.();
                    }}
                    className={cn(
                      "relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors",
                      active
                        ? "bg-white/10 text-foam"
                        : "text-white/65 hover:bg-white/5 hover:text-foam"
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden
                        className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-lagoon"
                      />
                    )}
                    <Icon className="h-4 w-4 shrink-0 opacity-80" strokeWidth={1.75} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          );
        })}
      </nav>
    </div>
  );
}

export function DesktopSidebar() {
  return (
    <aside className="hidden h-dvh w-[15.5rem] shrink-0 border-r border-black/40 lg:sticky lg:top-0 lg:flex lg:flex-col">
      <NavPanel />
    </aside>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const portal = role ? effectivePortalRole(role) : null;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-foam/95 pt-[max(0px,env(safe-area-inset-top))] backdrop-blur-md lg:hidden">
        <BrandStripe />
        <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-sand text-ink"
        >
          <span className="sr-only">Menu</span>
          {open ? (
            <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
              <path
                d="M4 4l10 10M14 4L4 14"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
              <path
                d="M3 5h12M3 9h12M3 13h12"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-tight text-ink">
            {PRODUCT_NAME}
          </p>
          <p className="truncate text-[11px] text-muted">{portalEyebrow(portal)}</p>
        </div>
        <DashboardToggle />
        <NotificationsBell />
        </div>
      </header>

      <div
        aria-hidden={!open}
        className={cn(
          "fixed inset-0 z-40 bg-rail/50 transition-opacity duration-200 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setOpen(false)}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[min(17.5rem,88vw)] shadow-soft transition-transform duration-300 ease-brand lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <NavPanel onNavigate={() => setOpen(false)} />
          <div className="border-t border-white/10 bg-rail p-3">
            <WorkspaceSwitcher />
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="mt-3 px-2 text-xs text-white/50 hover:text-foam"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

/** @deprecated use DesktopSidebar + MobileNav via AppShell */
export function Sidebar() {
  return <DesktopSidebar />;
}
