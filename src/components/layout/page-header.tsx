import type { LucideIcon } from "lucide-react";
import { SectionIcon } from "@/components/ui/icon-label";

export function PageHeader({
  icon,
  kicker,
  title,
  description,
  actions,
}: {
  icon: LucideIcon;
  kicker?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <SectionIcon icon={icon} />
        <div className="min-w-0">
          {kicker ? <p className="page-kicker">{kicker}</p> : null}
          <h1
            className={
              kicker
                ? "mt-1 text-2xl font-semibold tracking-tight text-ink"
                : "text-2xl font-semibold tracking-tight text-ink"
            }
          >
            {title}
          </h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
