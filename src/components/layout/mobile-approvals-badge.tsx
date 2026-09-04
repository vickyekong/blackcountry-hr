"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

/** Compact approvals entry for the mobile top bar. */
export function MobileApprovalsBadge() {
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const [href, setHref] = useState("/staff");

  const role = session?.user?.role;
  const show = Boolean(role);

  const load = useCallback(() => {
    if (!show) return;
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setUnreadCount(data.unreadCount ?? 0);
        const first = (data.notifications ?? []).find(
          (n: { readAt: string | null; linkUrl: string; type: string }) =>
            !n.readAt && n.type === "PAYROLL_REVIEW"
        );
        if (first?.linkUrl) {
          const path = String(first.linkUrl).replace(/^https?:\/\/[^/]+/, "");
          setHref(path.includes("step=") ? path : `${path}${path.includes("?") ? "&" : "?"}step=4`);
        } else if (role === "EMPLOYEE") {
          setHref("/staff");
        } else if (role === "FINANCE") {
          setHref("/finance");
        } else {
          setHref("/approvals");
        }
      })
      .catch(() => undefined);
  }, [show, role]);

  useEffect(() => {
    load();
    if (!show) return;
    const id = window.setInterval(load, 30000);
    return () => window.clearInterval(id);
  }, [show, load]);

  if (!show) return null;

  return (
    <Link
      href={href}
      aria-label={
        unreadCount > 0
          ? `${unreadCount} unread`
          : role === "EMPLOYEE"
            ? "Inbox"
            : "Approvals inbox"
      }
      className="relative inline-flex h-10 items-center justify-center rounded-lg border border-line bg-mist px-3 text-sm font-medium text-ink transition hover:border-ok/40"
    >
      {role === "EMPLOYEE" ? "Inbox" : "Clear"}
      {unreadCount > 0 && (
        <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-[1.15rem] items-center justify-center rounded-md bg-ok px-1 py-0.5 text-[10px] font-semibold text-foam">
          {unreadCount}
        </span>
      )}
    </Link>
  );
}
