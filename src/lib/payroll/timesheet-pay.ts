import type { EmployeeCompensation } from "./types";

export const STANDARD_HOURS_PER_DAY = 8;

export function standardMinutesForMonth(workingDaysPerMonth: number) {
  return Math.max(1, workingDaysPerMonth) * STANDARD_HOURS_PER_DAY * 60;
}

export function koboForWorkedMinutes(
  monthlyKobo: bigint,
  workedMinutes: number,
  standardMinutes: number
): bigint {
  if (workedMinutes <= 0 || standardMinutes <= 0) return 0n;
  return (monthlyKobo * BigInt(workedMinutes)) / BigInt(standardMinutes);
}

export type TimesheetPayMeta = {
  minutes: number;
  hours: number;
  overtimeMinutes: number;
  overtimeHours: number;
  overtimeKobo: bigint;
  paidFromHours: boolean;
};

/**
 * Contract staff are paid from approved timesheet hours (monthly basic as the
 * full-month rate). Full-time keep monthly salary; hours above the standard
 * month are overtime on taxable allowances.
 */
export function applyTimesheetsToCompensation(input: {
  employmentType: string;
  compensation: EmployeeCompensation;
  approvedMinutes: number;
  workingDaysPerMonth: number;
}): { compensation: EmployeeCompensation; timesheet: TimesheetPayMeta } {
  const standardMinutes = standardMinutesForMonth(input.workingDaysPerMonth);
  const minutes = Math.max(0, input.approvedMinutes);
  const hours = Number((minutes / 60).toFixed(2));
  const isContract = input.employmentType === "CONTRACT";

  if (isContract) {
    const scale = (amount: bigint) =>
      koboForWorkedMinutes(amount, minutes, standardMinutes);
    return {
      compensation: {
        ...input.compensation,
        basicSalaryKobo: scale(input.compensation.basicSalaryKobo),
        housingAllowanceKobo: scale(input.compensation.housingAllowanceKobo),
        transportAllowanceKobo: scale(input.compensation.transportAllowanceKobo),
        otherTaxableAllowancesKobo: scale(
          input.compensation.otherTaxableAllowancesKobo
        ),
        nonTaxableReimbursementsKobo: scale(
          input.compensation.nonTaxableReimbursementsKobo
        ),
      },
      timesheet: {
        minutes,
        hours,
        overtimeMinutes: 0,
        overtimeHours: 0,
        overtimeKobo: 0n,
        paidFromHours: true,
      },
    };
  }

  const overtimeMinutes = Math.max(0, minutes - standardMinutes);
  const overtimeKobo = koboForWorkedMinutes(
    input.compensation.basicSalaryKobo,
    overtimeMinutes,
    standardMinutes
  );

  return {
    compensation: {
      ...input.compensation,
      otherTaxableAllowancesKobo:
        input.compensation.otherTaxableAllowancesKobo + overtimeKobo,
    },
    timesheet: {
      minutes,
      hours,
      overtimeMinutes,
      overtimeHours: Number((overtimeMinutes / 60).toFixed(2)),
      overtimeKobo,
      paidFromHours: false,
    },
  };
}
