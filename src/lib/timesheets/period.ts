import { prisma } from "@/lib/db";

export function utcMonthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}

export function utcDay(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Monday 00:00 UTC for the week containing `date` (attendance-style week). */
export function utcWeekStart(date: Date | string): Date {
  const d = utcDay(date);
  const weekday = d.getUTCDay(); // 0 Sun … 6 Sat
  const back = weekday === 0 ? 6 : weekday - 1;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - back));
}

export function utcWeekEndExclusive(weekStart: Date | string): Date {
  const start = utcWeekStart(weekStart);
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 7));
}

export function utcWeekDays(weekStart: Date | string): Date[] {
  const start = utcWeekStart(weekStart);
  return Array.from({ length: 7 }, (_, i) =>
    new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + i))
  );
}

export function isoDateUtc(date: Date | string): string {
  const d = utcDay(date);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatWeekRange(weekStart: Date | string): string {
  const start = utcWeekStart(weekStart);
  const last = utcWeekDays(start)[6];
  const fmt = new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${fmt.format(start)} – ${fmt.format(last)}`;
}

/** Approved timesheet minutes for a payroll period, grouped by employee. */
export async function approvedTimesheetHoursForPeriod(
  companyId: string,
  periodYear: number,
  periodMonth: number
) {
  const { start, end } = utcMonthRange(periodYear, periodMonth);
  const rows = await prisma.timesheetEntry.groupBy({
    by: ["employeeId"],
    where: {
      companyId,
      status: "APPROVED",
      workDate: { gte: start, lt: end },
    },
    _sum: { minutes: true },
  });
  return rows.map((row) => ({
    employeeId: row.employeeId,
    minutes: row._sum.minutes ?? 0,
    hours: Number(((row._sum.minutes ?? 0) / 60).toFixed(2)),
  }));
}
