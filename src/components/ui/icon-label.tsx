import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export function SectionIcon({
  icon: Icon,
  tone = "lagoon",
  size = "md",
  className,
}: {
  icon: LucideIcon;
  tone?: "lagoon" | "ink" | "foam" | "ok" | "sky" | "signal";
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md",
        size === "sm" ? "h-7 w-7" : "h-10 w-10",
        tone === "lagoon" && "bg-lagoon text-ink",
        tone === "ink" && "bg-ink text-lagoon",
        tone === "foam" && "bg-sand text-ink",
        tone === "ok" && "bg-ok text-foam",
        tone === "sky" && "bg-sky text-ink",
        tone === "signal" && "bg-signal text-foam",
        className
      )}
    >
      <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5"} strokeWidth={1.75} />
    </span>
  );
}

export function IconLabel({
  icon: Icon,
  children,
  className,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Icon className="h-4 w-4 shrink-0 opacity-80" strokeWidth={1.75} />
      {children}
    </span>
  );
}
