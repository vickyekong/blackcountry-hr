import { STANDARD_HOURS_PER_DAY } from "@/lib/payroll/timesheet-pay";

/** Full-time week used for capacity / workload (Mon–Fri × 8 hours). */
export const WEEKLY_CAPACITY_MINUTES = 5 * STANDARD_HOURS_PER_DAY * 60;

export function minutesToHours(minutes: number) {
  return Math.round((minutes / 60) * 10) / 10;
}

export function workloadPercent(
  plannedMinutes: number,
  capacityMinutes = WEEKLY_CAPACITY_MINUTES
) {
  if (capacityMinutes <= 0) return 0;
  return Math.round((plannedMinutes / capacityMinutes) * 100);
}

export function remainingCapacityMinutes(
  plannedMinutes: number,
  capacityMinutes = WEEKLY_CAPACITY_MINUTES
) {
  return Math.max(0, capacityMinutes - Math.max(0, plannedMinutes));
}
