import { cn } from "@/lib/cn";

const variants = {
  default: "bg-sand text-ink-soft ring-1 ring-line",
  success: "bg-ok/10 text-ok ring-1 ring-ok/15",
  warning: "bg-warn/10 text-warn ring-1 ring-warn/15",
  danger: "bg-signal/10 text-signal ring-1 ring-signal/15",
  info: "bg-sky/12 text-sky ring-1 ring-sky/20",
};

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function payrollStatusVariant(
  status: string
): keyof typeof variants {
  switch (status) {
    case "DRAFT":
      return "default";
    case "UNDER_REVIEW":
      return "warning";
    case "APPROVED":
      return "info";
    case "FORWARDED_TO_FINANCE":
      return "info";
    case "PROCESSING":
      return "warning";
    case "PAID":
      return "success";
    default:
      return "default";
  }
}

export function employeeStatusVariant(
  status: string
): keyof typeof variants {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "ON_LEAVE":
    case "SICK_LEAVE":
      return "info";
    case "SUSPENDED":
      return "warning";
    case "FIRED":
    case "RESIGNED":
    case "TERMINATED":
      return "danger";
    default:
      return "default";
  }
}
