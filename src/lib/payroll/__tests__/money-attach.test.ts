import { describe, it, expect } from "vitest";
import { nairaToKobo } from "@/lib/money";
import {
  compensationFromStructure,
  installmentKobo,
  loanRepaymentTotalKobo,
  nextChargeKobo,
  remainingKobo,
} from "@/lib/payroll/money-math";
import { aggregateAdjustments } from "@/lib/payroll/adjustments";

describe("installmentKobo", () => {
  it("splits ₦300,000 over 3 months", () => {
    expect(installmentKobo(nairaToKobo(300_000), 3)).toBe(nairaToKobo(100_000));
  });

  it("rounds up so the last month can be smaller", () => {
    expect(installmentKobo(nairaToKobo(100_000), 3)).toBe(3_333_334n);
  });
});

describe("remaining and next charge", () => {
  it("ignores draft run charges when computing remaining", () => {
    const total = nairaToKobo(300_000);
    const charges = [
      { amountKobo: nairaToKobo(100_000), runStatus: "PAID" },
      { amountKobo: nairaToKobo(100_000), runStatus: "DRAFT" },
    ];
    expect(remainingKobo(total, charges)).toBe(nairaToKobo(200_000));
    expect(nextChargeKobo(total, 3, charges)).toBe(nairaToKobo(100_000));
  });

  it("clears when settled charges cover the total", () => {
    const total = nairaToKobo(90_000);
    const charges = [
      { amountKobo: nairaToKobo(30_000), runStatus: "PAID" },
      { amountKobo: nairaToKobo(30_000), runStatus: "APPROVED" },
      { amountKobo: nairaToKobo(30_000), runStatus: "FORWARDED_TO_FINANCE" },
    ];
    expect(remainingKobo(total, charges)).toBe(0n);
    expect(nextChargeKobo(total, 3, charges)).toBe(0n);
  });
});

describe("compensationFromStructure", () => {
  it("rolls feeding, medical, and communication into other taxable", () => {
    const pay = compensationFromStructure({
      basicSalaryKobo: nairaToKobo(200_000),
      housingAllowanceKobo: nairaToKobo(80_000),
      transportAllowanceKobo: nairaToKobo(40_000),
      feedingAllowanceKobo: nairaToKobo(10_000),
      medicalAllowanceKobo: nairaToKobo(5_000),
      communicationAllowanceKobo: nairaToKobo(5_000),
      otherTaxableAllowancesKobo: nairaToKobo(2_000),
      nonTaxableReimbursementsKobo: nairaToKobo(3_000),
    });
    expect(pay.otherTaxableAllowancesKobo).toBe(nairaToKobo(22_000));
    expect(pay.basicSalaryKobo).toBe(nairaToKobo(200_000));
  });
});

describe("loanRepaymentTotalKobo", () => {
  it("adds optional interest to principal", () => {
    expect(
      loanRepaymentTotalKobo(nairaToKobo(500_000), nairaToKobo(50_000))
    ).toBe(nairaToKobo(550_000));
  });
});

describe("aggregateAdjustments money extras", () => {
  it("maps benefit and cooperative lines to other deductions", () => {
    const result = aggregateAdjustments([
      { type: "BENEFIT_DEDUCTION", amountKobo: nairaToKobo(-8_000) },
      { type: "COOPERATIVE", amountKobo: nairaToKobo(-5_000) },
      { type: "CUSTOM_DEDUCTION", amountKobo: nairaToKobo(-2_000) },
    ]);
    expect(result.otherDeductionsKobo).toBe(nairaToKobo(15_000));
  });
});
