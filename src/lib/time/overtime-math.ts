import {
  getDailyRateFromMonthly,
} from "@/lib/payroll/calculate-payroll";
import { STANDARD_HOURS_PER_DAY } from "@/lib/payroll/timesheet-pay";

/** Weekday overtime multiplier in basis points (15000 = 1.5×). */
export const WEEKDAY_OVERTIME_BPS = 15000;
/** Weekend / public-holiday overtime multiplier (20000 = 2×). */
export const HOLIDAY_OVERTIME_BPS = 20000;

export function overtimeKobo(params: {
  monthlyBasicKobo: bigint;
  workingDaysPerMonth: number;
  minutes: number;
  multiplierBps: number;
}): bigint {
  const minutes = Math.max(0, Math.floor(params.minutes));
  if (minutes <= 0) return 0n;
  const daily = getDailyRateFromMonthly(
    params.monthlyBasicKobo,
    params.workingDaysPerMonth
  );
  const bps = BigInt(Math.max(0, Math.floor(params.multiplierBps)));
  const dayMinutes = BigInt(STANDARD_HOURS_PER_DAY * 60);
  return (daily * BigInt(minutes) * bps) / (dayMinutes * 10000n);
}

export function overtimeMultiplierBps(options: {
  workDate: Date;
  holiday: boolean;
}): number {
  if (options.holiday) return HOLIDAY_OVERTIME_BPS;
  const day = options.workDate.getDay();
  if (day === 0 || day === 6) return HOLIDAY_OVERTIME_BPS;
  return WEEKDAY_OVERTIME_BPS;
}
