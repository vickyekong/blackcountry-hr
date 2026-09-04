import { describe, expect, it } from "vitest";
import { nairaToKobo } from "@/lib/money";
import { addExpenseReimbursements } from "@/lib/expenses/compensation";
import { applyTimesheetsToCompensation } from "@/lib/payroll/timesheet-pay";
import { calculatePayroll } from "@/lib/payroll/calculate-payroll";
import { DEFAULT_NTA2025_TAX_BANDS } from "@/lib/payroll/paye";
import type { StatutoryConfigInput } from "@/lib/payroll/types";

const compensation = {
  basicSalaryKobo: nairaToKobo(200_000),
  housingAllowanceKobo: 0n,
  transportAllowanceKobo: 0n,
  otherTaxableAllowancesKobo: 0n,
  nonTaxableReimbursementsKobo: nairaToKobo(5_000),
  annualRentKobo: 0n,
};

const config: StatutoryConfigInput = {
  pensionEmployeeRateBps: 800,
  pensionEmployerRateBps: 1000,
  nhfEnabled: true,
  nhfRateBps: 250,
  nsitfRateBps: 100,
  taxReliefMode: "NTA2025",
  taxFreeThresholdKobo: nairaToKobo(800_000),
  craFixedKobo: nairaToKobo(200_000),
  craPercentBps: 100,
  craGrossPercentBps: 2000,
  rentReliefCapKobo: nairaToKobo(500_000),
  minimumWageExemptKobo: nairaToKobo(840_000),
  workingDaysPerMonth: 22,
  taxBands: DEFAULT_NTA2025_TAX_BANDS,
};

describe("payroll expense attach", () => {
  it("adds reimbursements after timesheet scaling so they are not pro-rated", () => {
    const scaled = applyTimesheetsToCompensation({
      employmentType: "CONTRACT",
      compensation,
      approvedMinutes: 0,
      workingDaysPerMonth: 22,
    });
    expect(scaled.compensation.nonTaxableReimbursementsKobo).toBe(0n);

    const withClaim = addExpenseReimbursements(
      scaled.compensation,
      nairaToKobo(40_000)
    );
    expect(withClaim.nonTaxableReimbursementsKobo).toBe(nairaToKobo(40_000));
    expect(withClaim.basicSalaryKobo).toBe(0n);
  });

  it("does not increase PAYE when a reimbursement is attached", () => {
    const period = { month: 1, year: 2026 };
    const without = calculatePayroll(
      { ...compensation, nonTaxableReimbursementsKobo: 0n },
      config,
      period
    );
    const withClaim = calculatePayroll(
      addExpenseReimbursements(
        { ...compensation, nonTaxableReimbursementsKobo: 0n },
        nairaToKobo(80_000)
      ),
      config,
      period
    );
    expect(withClaim.deductions.payeKobo).toBe(without.deductions.payeKobo);
    expect(withClaim.earnings.nonTaxableReimbursementsKobo).toBe(
      nairaToKobo(80_000)
    );
    expect(withClaim.netPayKobo).toBe(without.netPayKobo + nairaToKobo(80_000));
  });
});
