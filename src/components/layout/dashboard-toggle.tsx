"use client";

import { LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/cn";
import { useDashboardView } from "@/components/layout/dashboard-view-context";

export function DashboardToggle({
  variant = "bar",
}: {
  variant?: "bar" | "rail";
}) {
  const { open, toggle } = useDashboardView();

  return (
    <button
      type="button"
      aria-pressed={open}
      aria-label={open ? "Close dashboard" : "Open dashboard"}
      onClick={toggle}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-semibold tracking-tight transition",
        variant === "rail"
          ? cn(
              "h-9 w-full px-2.5",
              open
                ? "bg-lagoon text-ink"
                : "text-white/75 hover:bg-white/5 hover:text-foam"
            )
          : cn(
              "h-9 px-3.5",
              open
                ? "bg-lagoon text-ink"
                : "border border-line bg-foam text-ink hover:bg-sand"
            )
      )}
    >
      <LayoutDashboard className="h-4 w-4" strokeWidth={1.75} />
      Dashboard
    </button>
  );
}
