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
