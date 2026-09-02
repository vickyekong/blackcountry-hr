import { localDateKey } from "@/lib/time/dates";

function holidaySet(holidayKeys?: Iterable<string>): Set<string> | null {
  if (!holidayKeys) return null;
  return holidayKeys instanceof Set ? holidayKeys : new Set(holidayKeys);
}

/** Count Mon–Fri days inclusive between two dates, skipping company holidays. */
export function countWorkingDaysBetween(
  start: Date,
  end: Date,
  holidayKeys?: Iterable<string>
): number {
  const from = new Date(start);
  from.setHours(0, 0, 0, 0);
  const to = new Date(end);
  to.setHours(0, 0, 0, 0);

  if (from > to) return 0;

  const holidays = holidaySet(holidayKeys);
  let count = 0;
  const current = new Date(from);
  while (current <= to) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      if (!holidays || !holidays.has(localDateKey(current))) count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

export function getPeriodOverlap(
  leaveStart: Date,
  leaveEnd: Date,
  periodStart: Date,
  periodEnd: Date
): { start: Date; end: Date } | null {
  const start = new Date(
    Math.max(leaveStart.getTime(), periodStart.getTime())
  );
  const end = new Date(Math.min(leaveEnd.getTime(), periodEnd.getTime()));
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  if (start > end) return null;
  return { start, end };
}

export function unpaidWorkingDaysInPeriod(
  leaveStart: Date,
  leaveEnd: Date,
  periodStart: Date,
  periodEnd: Date,
  holidayKeys?: Iterable<string>
): number {
  const overlap = getPeriodOverlap(
    leaveStart,
    leaveEnd,
    periodStart,
    periodEnd
  );
  if (!overlap) return 0;
  return countWorkingDaysBetween(overlap.start, overlap.end, holidayKeys);
}

export interface LeaveRequestDates {
  startDate: Date;
  endDate: Date;
}

/** Sum unpaid working days from approved leave overlapping a payroll period. */
export function sumUnpaidLeaveDaysInPeriod(
  requests: LeaveRequestDates[],
  periodStart: Date,
  periodEnd: Date,
  holidayKeys?: Iterable<string>
): number {
  return requests.reduce(
    (total, req) =>
      total +
      unpaidWorkingDaysInPeriod(
        req.startDate,
        req.endDate,
        periodStart,
        periodEnd,
        holidayKeys
      ),
    0
  );
}
