import { describe, expect, it } from "vitest";
import { nairaToKobo } from "@/lib/money";
import {
  applyTimesheetsToCompensation,
  koboForWorkedMinutes,
  standardMinutesForMonth,
} from "@/lib/payroll/timesheet-pay";

const monthly = nairaToKobo(220_000);
const compensation = {
  basicSalaryKobo: monthly,
  housingAllowanceKobo: 0n,
  transportAllowanceKobo: 0n,
  otherTaxableAllowancesKobo: 0n,
  nonTaxableReimbursementsKobo: 0n,
};

describe("timesheet pay", () => {
  it("uses 22 days × 8 hours as the standard month", () => {
    expect(standardMinutesForMonth(22)).toBe(22 * 8 * 60);
  });

  it("pays contract staff from approved hours against the monthly rate", () => {
    const halfMonth = standardMinutesForMonth(22) / 2;
    const result = applyTimesheetsToCompensation({
      employmentType: "CONTRACT",
      compensation,
      approvedMinutes: halfMonth,
      workingDaysPerMonth: 22,
    });
    expect(result.timesheet.paidFromHours).toBe(true);
    expect(result.compensation.basicSalaryKobo).toBe(monthly / 2n);
  });

  it("pays a contract staff member nothing when there are no approved hours", () => {
    const result = applyTimesheetsToCompensation({
      employmentType: "CONTRACT",
      compensation,
      approvedMinutes: 0,
      workingDaysPerMonth: 22,
    });
    expect(result.compensation.basicSalaryKobo).toBe(0n);
  });

  it("keeps full-time monthly salary and adds overtime above a standard month", () => {
    const extraHours = 10;
    const result = applyTimesheetsToCompensation({
      employmentType: "FULL_TIME",
      compensation,
      approvedMinutes: standardMinutesForMonth(22) + extraHours * 60,
      workingDaysPerMonth: 22,
    });
    expect(result.timesheet.paidFromHours).toBe(false);
    expect(result.compensation.basicSalaryKobo).toBe(monthly);
    expect(result.compensation.otherTaxableAllowancesKobo).toBe(
      koboForWorkedMinutes(monthly, extraHours * 60, standardMinutesForMonth(22))
    );
  });
});
