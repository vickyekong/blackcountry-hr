import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { PRODUCT_NAME } from "@/lib/brand";
import { RunPayrollCta } from "@/components/dashboard/run-payroll-cta";
import type { getCommandCenterData } from "@/lib/dashboard/command-center";
import {
  Inbox,
  Wallet,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Clock,
  FolderKanban,
  GraduationCap,
  Package,
  MessageCircle,
  BarChart3,
  Users,
} from "lucide-react";

type CommandCenterData = Awaited<ReturnType<typeof getCommandCenterData>>;

export function CommandCenterHero({
  data,
  userName,
}: {
  data: CommandCenterData;
  userName: string;
}) {
  const firstName = userName.split(" ")[0] || "Leader";
  const runLabel = `Run Payroll — ${data.userFacingPeriod.label} ${data.userFacingPeriod.year}`;

  return (
    <div className="mb-8 animate-fade-up">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="page-kicker">{PRODUCT_NAME}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Welcome back, {firstName}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Command center — actions, payroll run-rate, and compliance at a
            glance
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <RunPayrollCta label={runLabel} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <section className="surface-panel px-4 py-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            <Inbox className="h-3.5 w-3.5" strokeWidth={1.75} />
            Action required ({data.actionCount})
          </p>
          {data.actions.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Inbox clear.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {data.actions.slice(0, 5).map((a) => (
                <li key={a.id}>
                  <Link
                    href={a.href}
                    className="flex justify-between gap-2 text-sm text-ink-soft hover:text-ok-deep"
                  >
                    <span>
                      <span className="font-semibold text-ok">{a.count}</span>{" "}
                      {a.label}
                    </span>
                    <span className="shrink-0 text-muted">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface-panel px-4 py-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            <Wallet className="h-3.5 w-3.5" strokeWidth={1.75} />
            Payroll run-rate
          </p>
          {data.runRate ? (
            <div className="mt-3 space-y-1">
              <p className="text-3xl font-semibold tabular-nums tracking-tight text-ink">
                {formatCurrency(BigInt(data.runRate.netKobo))}
              </p>
              <p className="text-sm text-muted">
                Net · {data.runRate.periodLabel}
                {data.runRate.deltaPct != null && (
                  <span className="ml-1 font-medium text-ink-soft">
                    ({data.runRate.deltaPct > 0 ? "+" : ""}
                    {data.runRate.deltaPct}% vs prior)
                  </span>
                )}
              </p>
              <p className="text-xs text-muted">
                Next target run: {data.nextRunLabel} · {data.runRate.headcount}{" "}
                staff
              </p>
              <Link
                href={`/payroll/${data.runRate.runId}`}
                className="mt-2 inline-block text-xs font-medium text-ok hover:text-ok-deep"
              >
                Open last approved run →
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">
              No approved payroll yet. Create a run to unlock run-rate.
            </p>
          )}
        </section>

        <section className="surface-panel px-4 py-4 sm:col-span-2 lg:col-span-1">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
            Compliance status
          </p>
          <div className="mt-3 space-y-2 text-sm">
            <p
              className={
                data.compliance.taxCompliant
                  ? "font-medium text-ok"
                  : "font-medium text-warn"
              }
            >
              {data.compliance.taxCompliant
                ? "Tax IDs complete for active staff"
                : `${data.compliance.missingTin} staff missing TIN`}
            </p>
            <p className="text-muted">
              {data.compliance.pensionsDue === 0
                ? "RSA PINs complete"
                : `${data.compliance.pensionsDue} pensions / RSA PIN due`}
            </p>
            <Link
              href="/hr-ask"
              className="inline-block text-xs font-medium text-ok hover:text-ok-deep"
            >
              Query compliance gaps →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export function OmniCoPilotStrip({
  lines,
}: {
  lines: CommandCenterData["coPilot"];
}) {
  return (
    <section className="mb-8 animate-fade-up rounded-lg border border-rail bg-rail px-5 py-5 text-foam">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-lagoon">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
          Omni Co-Pilot insights
        </p>
        <Link
          href="/copilot"
          className="text-xs font-semibold text-lagoon hover:text-foam"
        >
          Ask a question →
        </Link>
      </div>
      {lines.length === 0 ? (
        <p className="mt-2 text-sm text-lagoon-mist/60">
          Insights appear as attendance, leave, and payroll data accumulate.
        </p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {lines.slice(0, 5).map((line) => (
            <li
              key={line.id}
              className="border-l-2 border-lagoon/50 pl-3 text-sm leading-relaxed text-lagoon-mist/90"
            >
              {line.href ? (
                <Link href={line.href} className="hover:text-foam">
                  {line.text}
                </Link>
              ) : (
                line.text
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function QuickWorkflows({
  showOnboard = true,
  showHrAsk = true,
  timesheetsLabel = "Review timesheets",
}: {
  showOnboard?: boolean;
  showHrAsk?: boolean;
  timesheetsLabel?: string;
}) {
  const items = [
    ...(showOnboard
      ? [
          { href: "/recruitment", label: "Recruitment", icon: UserPlus },
          { href: "/employees/new", label: "Onboard employee", icon: Users },
        ]
      : []),
    { href: "/timesheets", label: timesheetsLabel, icon: Clock },
    { href: "/projects", label: "Projects", icon: FolderKanban },
    { href: "/training", label: "Training", icon: GraduationCap },
    { href: "/assets", label: "Assets", icon: Package },
    ...(showHrAsk
      ? [{ href: "/hr-ask", label: "Draft policy / query desk", icon: MessageCircle }]
      : []),
    { href: "/reports", label: "Run headcount forecast", icon: BarChart3 },
    { href: "/copilot", label: "Ask Omni Co-Pilot", icon: Sparkles },
  ];

  return (
    <section className="mb-8 animate-fade-up">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted">
        Quick workflows
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-foam px-3 text-sm font-medium text-ink transition hover:bg-sand"
          >
            <item.icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            {item.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
