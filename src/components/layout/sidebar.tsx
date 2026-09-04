"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/cn";
import {
  can,
  effectivePortalRole,
  portalLabel,
} from "@/lib/permissions";
import { PRODUCT_NAME } from "@/lib/brand";
import { useCompanyBrand } from "@/components/brand/company-brand-provider";
import type { UserRole } from "@prisma/client";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import { MobileApprovalsBadge } from "@/components/layout/mobile-approvals-badge";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";

const staffNavItems: Array<{ href: string; label: string }> = [
  { href: "/staff", label: "Home" },
  { href: "/staff/profile", label: "My details" },
  { href: "/staff/leave", label: "Leave" },
  { href: "/staff/timesheets", label: "Timesheets" },
  { href: "/staff/projects", label: "Projects" },
  { href: "/staff/files", label: "Files" },
  { href: "/staff/requests", label: "Requests" },
  { href: "/staff/payslips", label: "Payslips" },
  { href: "/staff/advances", label: "Advances" },
  { href: "/staff/expenses", label: "Expenses" },
  { href: "/staff/performance", label: "Performance" },
];

const financeNavItems: Array<{ href: string; label: string }> = [
  { href: "/finance", label: "Payroll to process" },
  { href: "/finance/expenses", label: "Expenses" },
];

const navItems: Array<{
  href: string;
  label: string;
  roles: UserRole[];
}> = [
  {
    href: "/dashboard",
    label: "Overview",
    roles: ["SUPER_ADMIN", "HR_ADMIN", "BUSINESS_HEAD"],
  },
  {
    href: "/approvals",
    label: "Approvals",
    roles: ["SUPER_ADMIN", "HR_ADMIN", "BUSINESS_HEAD"],
  },
  {
    href: "/copilot",
    label: "Co-Pilot",
    roles: ["SUPER_ADMIN", "HR_ADMIN", "BUSINESS_HEAD"],
  },
  {
    href: "/employees",
    label: "Employees",
    roles: ["SUPER_ADMIN", "HR_ADMIN", "BUSINESS_HEAD"],
  },
  {
    href: "/assets",
    label: "Assets",
    roles: ["SUPER_ADMIN", "HR_ADMIN", "BUSINESS_HEAD"],
  },
  {
    href: "/recruitment",
    label: "Recruitment",
    roles: ["SUPER_ADMIN", "HR_ADMIN"],
  },
  {
    href: "/training",
    label: "Training",
    roles: ["SUPER_ADMIN", "HR_ADMIN", "BUSINESS_HEAD"],
  },
  {
    href: "/performance",
    label: "Performance",
    roles: ["SUPER_ADMIN", "HR_ADMIN", "BUSINESS_HEAD"],
  },
  {
    href: "/hr-desk",
    label: "HR Desk",
    roles: ["SUPER_ADMIN", "HR_ADMIN"],
  },
  {
    href: "/hr-ask",
    label: "HR Ask",
    roles: ["SUPER_ADMIN", "HR_ADMIN"],
  },
  {
    href: "/payroll",
    label: "Payroll",
    roles: ["SUPER_ADMIN", "HR_ADMIN"],
  },
  {
    href: "/expenses",
    label: "Expenses",
    roles: ["SUPER_ADMIN", "HR_ADMIN", "BUSINESS_HEAD"],
  },
  {
    href: "/timesheets",
    label: "Timesheets",
    roles: ["SUPER_ADMIN", "HR_ADMIN", "BUSINESS_HEAD"],
  },
  {
    href: "/projects",
    label: "Projects",
    roles: ["SUPER_ADMIN", "HR_ADMIN", "BUSINESS_HEAD"],
  },
  {
    href: "/files",
    label: "Files",
    roles: ["SUPER_ADMIN", "HR_ADMIN", "BUSINESS_HEAD"],
  },
  {
    href: "/leave",
    label: "Leave",
    roles: ["SUPER_ADMIN", "HR_ADMIN"],
  },
  {
    href: "/reports",
    label: "Reports",
    roles: ["SUPER_ADMIN", "HR_ADMIN", "BUSINESS_HEAD"],
  },
  {
    href: "/audit-log",
    label: "Audit log",
    roles: ["SUPER_ADMIN", "HR_ADMIN"],
  },
];

function NavPanel({
  onNavigate,
  compactHeader,
}: {
  onNavigate?: () => void;
  compactHeader?: boolean;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { brand } = useCompanyBrand();
  const role = session?.user?.role;
  const portal = role ? effectivePortalRole(role) : null;

  const visible =
    portal === "EMPLOYEE"
      ? staffNavItems.map((item) => ({ ...item, roles: ["EMPLOYEE" as const] }))
      : portal === "FINANCE"
        ? financeNavItems.map((item) => ({
            ...item,
            roles: ["FINANCE" as const],
          }))
        : navItems.filter((item) => role && item.roles.includes(role));

  return (
    <div className="flex h-full flex-col bg-ink text-foam">
      <div
        className={cn(
          "border-b border-white/10 px-5",
          compactHeader ? "py-4" : "py-6"
        )}
      >
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-lagoon-mist/70">
          {portal === "SUPER_ADMIN"
            ? "Super Admin"
            : portal === "HR_ADMIN"
              ? "HR"
              : portal === "FINANCE"
                ? "Finance"
                : portal === "BUSINESS_HEAD"
                  ? "Business head"
                  : portal === "EMPLOYEE"
                    ? "Staff"
                    : "Workspace"}
        </p>
        <div className="mt-2 flex items-center gap-3">
          {brand?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logoUrl}
              alt=""
              className="h-10 w-10 shrink-0 rounded-lg bg-white/10 object-contain p-0.5"
            />
          ) : null}
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foam">
              {PRODUCT_NAME}
            </h1>
            {brand?.name ? (
              <p className="truncate text-xs font-medium text-lagoon-mist/80">
                {brand.name}
              </p>
            ) : null}
          </div>
        </div>
        {!compactHeader && (
          <p className="mt-2 text-xs leading-snug text-lagoon-mist/60">
            {portal === "SUPER_ADMIN"
              ? "Clear payroll & sensitive updates"
              : portal === "HR_ADMIN"
                ? "People ops — seek clearance when needed"
                : portal === "FINANCE"
                  ? "Process approved payroll for this company"
                  : portal === "BUSINESS_HEAD"
                    ? "This company’s people, projects, and files"
                    : portal === "EMPLOYEE"
                      ? "Your details, leave, timesheets, projects, advances, expenses, and requests"
                      : null}
          </p>
        )}
      </div>

      <div className="border-b border-white/10 px-3 py-2">
        <NotificationsBell />
      </div>
      <WorkspaceSwitcher />

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {visible.map((item) => {
          const active =
            item.href === "/staff"
              ? pathname === "/staff"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "relative block rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-brand",
                active
                  ? "bg-lagoon text-ink shadow-soft"
                  : "text-lagoon-mist/75 hover:bg-white/5 hover:text-foam"
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-ink/80"
                />
              )}
              {item.label}
            </Link>
          );
        })}
        {role && can(role, "manageCompanySettings") && (
          <Link
            href="/settings"
            onClick={onNavigate}
            className={cn(
              "block rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-brand",
              pathname.startsWith("/settings")
                ? "bg-lagoon text-ink"
                : "text-lagoon-mist/75 hover:bg-white/5 hover:text-foam"
            )}
          >
            Settings
          </Link>
        )}
      </nav>

      <div className="border-t border-white/10 p-4">
        <p className="truncate text-sm font-medium text-foam">
          {session?.user?.name}
        </p>
        <p className="truncate text-xs text-lagoon-mist/55">
          {role ? portalLabel(role) : ""} · {session?.user?.email}
        </p>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="mt-3 text-xs text-lagoon-mist/55 transition hover:text-foam"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

export function DesktopSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-ink/10 lg:flex lg:flex-col">
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
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-line/70 bg-foam/90 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md lg:hidden">
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-mist text-ink transition hover:border-ok/40"
        >
          <span className="sr-only">Menu</span>
          {open ? (
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
              <path
                d="M4 4l10 10M14 4L4 14"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
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
          <p className="font-display truncate text-lg font-semibold tracking-tight text-ink">
            {PRODUCT_NAME}
          </p>
          <p className="truncate text-[11px] text-muted">
            {portal === "SUPER_ADMIN"
              ? "Super Admin"
              : portal === "HR_ADMIN"
                ? "HR"
                : portal === "FINANCE"
                  ? "Finance"
                  : portal === "BUSINESS_HEAD"
                    ? "Business head"
                    : portal === "EMPLOYEE"
                      ? "Staff"
                      : "Workspace"}
          </p>
        </div>
        <MobileApprovalsBadge />
      </header>

      {/* Backdrop */}
      <div
        aria-hidden={!open}
        className={cn(
          "fixed inset-0 z-40 bg-ink/50 transition-opacity duration-200 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setOpen(false)}
      />

      {/* Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[min(18.5rem,88vw)] border-r border-ink/10 shadow-soft transition-transform duration-300 ease-brand lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NavPanel compactHeader onNavigate={() => setOpen(false)} />
      </aside>
    </>
  );
}

/** @deprecated use DesktopSidebar + MobileNav via AppShell */
export function Sidebar() {
  return <DesktopSidebar />;
}
