export type PayslipCostSlice = {
  grossPayKobo: bigint;
  netPayKobo: bigint;
  payeKobo: bigint;
  pensionEmployeeKobo: bigint;
  pensionEmployerKobo: bigint;
  nhfKobo: bigint;
  nsitfKobo: bigint;
};

/** Gross + employer pension + NSITF — same basis as the payroll summary cards. */
export function employerCostKobo(slip: PayslipCostSlice): bigint {
  return slip.grossPayKobo + slip.pensionEmployerKobo + slip.nsitfKobo;
}

export function sumPayslipCosts(slips: PayslipCostSlice[]) {
  return slips.reduce(
    (acc, slip) => ({
      grossPayKobo: acc.grossPayKobo + slip.grossPayKobo,
      netPayKobo: acc.netPayKobo + slip.netPayKobo,
      payeKobo: acc.payeKobo + slip.payeKobo,
      pensionEmployeeKobo: acc.pensionEmployeeKobo + slip.pensionEmployeeKobo,
      pensionEmployerKobo: acc.pensionEmployerKobo + slip.pensionEmployerKobo,
      nhfKobo: acc.nhfKobo + slip.nhfKobo,
      nsitfKobo: acc.nsitfKobo + slip.nsitfKobo,
      employerCostKobo: acc.employerCostKobo + employerCostKobo(slip),
      headcount: acc.headcount + 1,
    }),
    {
      grossPayKobo: 0n,
      netPayKobo: 0n,
      payeKobo: 0n,
      pensionEmployeeKobo: 0n,
      pensionEmployerKobo: 0n,
      nhfKobo: 0n,
      nsitfKobo: 0n,
      employerCostKobo: 0n,
      headcount: 0,
    }
  );
}

export type PayrollMonthPoint = {
  month: number;
  year: number;
} & ReturnType<typeof sumPayslipCosts>;

export function mergePayrollMonth(
  existing: PayrollMonthPoint | undefined,
  month: number,
  year: number,
  slips: PayslipCostSlice[]
): PayrollMonthPoint {
  const next = sumPayslipCosts(slips);
  if (!existing) return { month, year, ...next };
  return {
    month,
    year,
    grossPayKobo: existing.grossPayKobo + next.grossPayKobo,
    netPayKobo: existing.netPayKobo + next.netPayKobo,
    payeKobo: existing.payeKobo + next.payeKobo,
    pensionEmployeeKobo: existing.pensionEmployeeKobo + next.pensionEmployeeKobo,
    pensionEmployerKobo: existing.pensionEmployerKobo + next.pensionEmployerKobo,
    nhfKobo: existing.nhfKobo + next.nhfKobo,
    nsitfKobo: existing.nsitfKobo + next.nsitfKobo,
    employerCostKobo: existing.employerCostKobo + next.employerCostKobo,
    headcount: Math.max(existing.headcount, next.headcount),
  };
}
