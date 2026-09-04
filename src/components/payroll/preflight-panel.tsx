"use client";

import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export type PreflightSeverity = "block" | "warn" | "info";

export interface PreflightException {
  id: string;
  severity: PreflightSeverity;
  code: string;
  title: string;
  detail: string;
  employeeId?: string;
  employeeCode?: string;
  href?: string;
  metric?: string;
}

export interface PreflightData {
  canSubmit: boolean;
  blockers: number;
  warnings: number;
  infos: number;
  exceptions: PreflightException[];
  totals: {
    grossKobo: string;
    netKobo: string;
    payeKobo: string;
    attendancePenaltyKobo: string;
    unpaidLeaveDeductionKobo: string;
  };
  vsPrior: {
    periodLabel: string | null;
    headcountDelta: number | null;
    netDeltaKobo: string | null;
  };
  payslipCount: number;
}

function severityClass(severity: PreflightSeverity) {
  switch (severity) {
    case "block":
      return "border-red-200 bg-red-50";
    case "warn":
      return "border-amber-200 bg-amber-50";
    default:
      return "border-line bg-sand";
  }
}

function severityLabel(severity: PreflightSeverity) {
  switch (severity) {
    case "block":
      return "Blocker";
    case "warn":
      return "Warning";
    default:
      return "Info";
  }
}

export function PayrollPreflightPanel({
  data,
  loading,
  onRefresh,
}: {
  data: PreflightData | null;
  loading?: boolean;
  onRefresh?: () => void;
}) {
  if (loading && !data) {
    return (
      <div className="mb-6 rounded-lg border border-line bg-white px-5 py-6 text-sm text-muted">
        Running pre-flight checks…
      </div>
    );
  }

  if (!data) return null;

  const statusLine = data.canSubmit
    ? data.warnings > 0
      ? `Ready to submit with ${data.warnings} warning${data.warnings === 1 ? "" : "s"} to review`
      : "Ready to submit — no blockers"
    : `${data.blockers} blocker${data.blockers === 1 ? "" : "s"} must be fixed before submit`;

  return (
    <section className="mb-6 rounded-lg border border-line bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">
            Pre-flight summary
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Exceptions before payment — bank, statutory IDs, pay variance, and
            auto deductions
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-md px-2 py-1 text-xs font-medium ${
              data.canSubmit
                ? "bg-emerald-50 text-emerald-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            {statusLine}
          </span>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="text-xs text-muted hover:text-ink"
            >
              Refresh
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-3 border-b border-line px-5 py-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs text-muted">Payslips</p>
          <p className="mt-0.5 text-sm font-medium tabular-nums">
            {data.payslipCount}
            {data.vsPrior.headcountDelta != null &&
              data.vsPrior.headcountDelta !== 0 && (
                <span className="ml-1 text-muted">
                  ({data.vsPrior.headcountDelta > 0 ? "+" : ""}
                  {data.vsPrior.headcountDelta} vs prior)
                </span>
              )}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">Gross</p>
          <p className="mt-0.5 text-sm font-medium tabular-nums">
            {formatCurrency(BigInt(data.totals.grossKobo))}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">Net</p>
          <p className="mt-0.5 text-sm font-medium tabular-nums">
            {formatCurrency(BigInt(data.totals.netKobo))}
            {data.vsPrior.netDeltaKobo != null && (
              <span className="ml-1 text-muted">
                ({Number(data.vsPrior.netDeltaKobo) >= 0 ? "+" : ""}
                {formatCurrency(BigInt(data.vsPrior.netDeltaKobo))} vs prior)
              </span>
            )}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">PAYE</p>
          <p className="mt-0.5 text-sm font-medium tabular-nums">
            {formatCurrency(BigInt(data.totals.payeKobo))}
          </p>
        </div>
      </div>

      {data.exceptions.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">
          No exceptions — figures look clean against the last paid run.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {data.exceptions.map((ex) => (
            <li
              key={ex.id}
              className={`px-5 py-3 ${severityClass(ex.severity)}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                      {severityLabel(ex.severity)}
                    </span>
                    <p className="text-sm font-medium text-ink">
                      {ex.title}
                    </p>
                    {ex.metric && (
                      <span className="text-xs tabular-nums text-muted">
                        {ex.metric}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted">{ex.detail}</p>
                </div>
                {ex.href && (
                  <Link
                    href={ex.href}
                    className="shrink-0 text-xs text-ink-soft underline-offset-2 hover:underline"
                  >
                    Fix →
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
