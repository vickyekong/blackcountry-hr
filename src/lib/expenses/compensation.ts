import type { EmployeeCompensation } from "@/lib/payroll/types";
import type { Kobo } from "@/lib/money";

/** Add approved payroll reimbursements after timesheet scaling so they are not pro-rated. */
export function addExpenseReimbursements(
  compensation: EmployeeCompensation,
  extraKobo: Kobo
): EmployeeCompensation {
  if (extraKobo <= 0n) return compensation;
  return {
    ...compensation,
    nonTaxableReimbursementsKobo:
      compensation.nonTaxableReimbursementsKobo + extraKobo,
  };
}
