"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/cn";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  linkUrl: string;
  readAt: string | null;
  createdAt: string;
  type: string;
}

export function NotificationsBell() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const role = session?.user?.role;
  const showBell = Boolean(role);

  const load = useCallback(() => {
    if (!showBell) return;
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setItems(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      })
      .catch(() => undefined);
  }, [showBell]);

  useEffect(() => {
    load();
    if (!showBell) return;
    const id = window.setInterval(load, 30000);
    return () => window.clearInterval(id);
  }, [showBell, load]);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!showBell) return null;

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    });
    load();
  }

  async function markAllRead() {
    await fetch("/api/notifications/all", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    load();
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-label={
          unreadCount > 0
            ? `${unreadCount} unread notifications`
            : role === "EMPLOYEE"
              ? "Inbox"
              : "Approvals and inbox"
        }
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
        }}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-foam text-ink transition hover:bg-sand"
      >
        <Bell className="h-4 w-4" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-lagoon px-1 py-0.5 text-[10px] font-bold text-ink">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-line bg-foam shadow-soft">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              Inbox
            </p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-xs font-medium text-muted hover:text-ink"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-auto">
            {items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted">
                No notifications
              </p>
            ) : (
              <ul>
                {items.map((item) => (
                  <li key={item.id} className="border-b border-line/70 last:border-0">
                    <Link
                      href={
                        item.linkUrl.replace(/^https?:\/\/[^/]+/, "") ||
                        item.linkUrl
                      }
                      onClick={() => {
                        void markRead(item.id);
                        setOpen(false);
                      }}
                      className={cn(
                        "block px-3 py-3 hover:bg-sand",
                        !item.readAt && "bg-lagoon/15"
                      )}
                    >
                      <p className="text-sm font-medium text-ink">{item.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                        {item.body}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
