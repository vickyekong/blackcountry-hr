import { minKobo } from "@/lib/money";
import type { Kobo } from "@/lib/money";

export const AUTO_ADVANCE_PREFIX = "Salary advance ";
export const AUTO_LOAN_PREFIX = "Salary loan ";
export const AUTO_BENEFIT_PREFIX = "Benefit plan ";
export const AUTO_DEDUCTION_PREFIX = "Recurring deduction ";

const SETTLED_RUN_STATUSES = new Set([
  "APPROVED",
  "FORWARDED_TO_FINANCE",
  "PROCESSING",
  "PAID",
]);

/** Even split rounded up so the last installment can be smaller. */
export function installmentKobo(totalKobo: Kobo, installments: number): Kobo {
  const months = Math.max(1, Math.floor(installments));
  return (totalKobo + BigInt(months - 1)) / BigInt(months);
}

export function loanRepaymentTotalKobo(
  principalKobo: Kobo,
  interestKobo: Kobo
): Kobo {
  return principalKobo + interestKobo;
}

export function settledChargeKobo(
  charges: Array<{ amountKobo: Kobo; runStatus: string }>
): Kobo {
  return charges.reduce(
    (sum, charge) =>
      SETTLED_RUN_STATUSES.has(charge.runStatus) ? sum + charge.amountKobo : sum,
    0n
  );
}

export function remainingKobo(
  totalKobo: Kobo,
  charges: Array<{ amountKobo: Kobo; runStatus: string }>
): Kobo {
  const left = totalKobo - settledChargeKobo(charges);
  return left > 0n ? left : 0n;
}

export function nextChargeKobo(
  totalKobo: Kobo,
  installments: number,
  charges: Array<{ amountKobo: Kobo; runStatus: string }>
): Kobo {
  const left = remainingKobo(totalKobo, charges);
  if (left <= 0n) return 0n;
  return minKobo(installmentKobo(totalKobo, installments), left);
}

export function otherTaxableFromStructure(structure: {
  feedingAllowanceKobo: Kobo;
  medicalAllowanceKobo: Kobo;
  communicationAllowanceKobo: Kobo;
  otherTaxableAllowancesKobo: Kobo;
}): Kobo {
  return (
    structure.feedingAllowanceKobo +
    structure.medicalAllowanceKobo +
    structure.communicationAllowanceKobo +
    structure.otherTaxableAllowancesKobo
  );
}

export function compensationFromStructure(structure: {
  basicSalaryKobo: Kobo;
  housingAllowanceKobo: Kobo;
  transportAllowanceKobo: Kobo;
  feedingAllowanceKobo: Kobo;
  medicalAllowanceKobo: Kobo;
  communicationAllowanceKobo: Kobo;
  otherTaxableAllowancesKobo: Kobo;
  nonTaxableReimbursementsKobo: Kobo;
}) {
  return {
    basicSalaryKobo: structure.basicSalaryKobo,
    housingAllowanceKobo: structure.housingAllowanceKobo,
    transportAllowanceKobo: structure.transportAllowanceKobo,
    otherTaxableAllowancesKobo: otherTaxableFromStructure(structure),
    nonTaxableReimbursementsKobo: structure.nonTaxableReimbursementsKobo,
  };
}

export function advanceAdjustmentDescription(advanceId: string) {
  return `${AUTO_ADVANCE_PREFIX}${advanceId}`;
}

export function loanAdjustmentDescription(loanId: string) {
  return `${AUTO_LOAN_PREFIX}${loanId}`;
}

export function benefitAdjustmentDescription(planId: string) {
  return `${AUTO_BENEFIT_PREFIX}${planId}`;
}

export function deductionAdjustmentDescription(deductionId: string) {
  return `${AUTO_DEDUCTION_PREFIX}${deductionId}`;
}

export function deductionAdjustmentType(kind: string) {
  return kind === "COOPERATIVE" ? "COOPERATIVE" : "CUSTOM_DEDUCTION";
}
