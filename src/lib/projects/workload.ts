import { STANDARD_HOURS_PER_DAY } from "@/lib/payroll/timesheet-pay";

/** Full-time week used for capacity / workload (Mon–Fri × 8 hours). */
export const WEEKLY_CAPACITY_MINUTES = 5 * STANDARD_HOURS_PER_DAY * 60;
export const DAILY_CAPACITY_MINUTES = STANDARD_HOURS_PER_DAY * 60;
export const WEEKDAY_COUNT = 5;

export function minutesToHours(minutes: number) {
  return Math.round((minutes / 60) * 10) / 10;
}

export function hoursToMinutes(hours: number) {
  return Math.max(0, Math.round(hours * 60));
}

/**
 * Spread a weekly allocation across Mon–Fri (indexes 0–4). Weekend stays 0.
 */
export function splitWeeklyMinutesAcrossWeekdays(totalMinutes: number): number[] {
  const parts = [0, 0, 0, 0, 0, 0, 0];
  let left = Math.max(0, Math.round(totalMinutes));
  for (let i = 0; i < WEEKDAY_COUNT; i += 1) {
    const share = Math.floor(left / (WEEKDAY_COUNT - i));
    parts[i] = share;
    left -= share;
  }
  return parts;
}

export function isOverDailyCapacity(
  plannedMinutes: number,
  capacityMinutes = DAILY_CAPACITY_MINUTES
) {
  return plannedMinutes > capacityMinutes;
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
