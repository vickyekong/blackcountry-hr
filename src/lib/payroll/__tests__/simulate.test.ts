import { describe, it, expect } from "vitest";
import { nairaToKobo } from "@/lib/money";
import { calculatePayroll } from "@/lib/payroll/calculate-payroll";
import { simulatePayrollImpact } from "@/lib/payroll/simulate";
import { DEFAULT_NTA2025_TAX_BANDS } from "@/lib/payroll/paye";
import type { StatutoryConfigInput } from "@/lib/payroll/types";

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

const employee = {
  basicSalaryKobo: nairaToKobo(220_000),
  housingAllowanceKobo: nairaToKobo(80_000),
  transportAllowanceKobo: nairaToKobo(40_000),
  otherTaxableAllowancesKobo: 0n,
  nonTaxableReimbursementsKobo: 0n,
};

describe("simulatePayrollImpact", () => {
  it("does not persist and reports a 10% salary increase against the same engine", () => {
    const result = simulatePayrollImpact(
      [employee],
      config,
      { month: 9, year: 2026 },
      { salaryIncreaseBps: 1000 }
    );
    const base = calculatePayroll(employee, config, { month: 9, year: 2026 });
    const raised = calculatePayroll(
      {
        ...employee,
        basicSalaryKobo: nairaToKobo(242_000),
        housingAllowanceKobo: nairaToKobo(88_000),
        transportAllowanceKobo: nairaToKobo(44_000),
      },
      config,
      { month: 9, year: 2026 }
    );
    expect(result.baseline.grossPayKobo).toBe(base.earnings.grossPayKobo);
    expect(result.scenario.grossPayKobo).toBe(raised.earnings.grossPayKobo);
    expect(result.variance.grossPayKobo).toBe(
      raised.earnings.grossPayKobo - base.earnings.grossPayKobo
    );
    expect(result.variance.payeKobo).toBe(
      raised.deductions.payeKobo - base.deductions.payeKobo
    );
  });

  it("adds extra hires to employer cost without changing current staff baseline", () => {
    const result = simulatePayrollImpact(
      [employee],
      config,
      { month: 9, year: 2026 },
      { extraHires: 2, extraHireMonthlyGrossNaira: 400_000 }
    );
    expect(result.extraHires).toBe(2);
    expect(result.variance.grossPayKobo > 0n).toBe(true);
    expect(result.baseline.grossPayKobo).toBe(
      calculatePayroll(employee, config, { month: 9, year: 2026 }).earnings
        .grossPayKobo
    );
  });
});
