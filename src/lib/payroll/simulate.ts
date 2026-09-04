import { applyRateBps, nairaToKobo } from "@/lib/money";
import type { Kobo } from "@/lib/money";
import { calculatePayroll } from "@/lib/payroll/calculate-payroll";
import type {
  EmployeeCompensation,
  PayrollAdjustments,
  PayrollPeriod,
  StatutoryConfigInput,
} from "@/lib/payroll/types";

export interface SimulateOptions {
  salaryIncreaseBps?: number;
  transportIncreaseNaira?: number;
  extraHires?: number;
  extraHireMonthlyGrossNaira?: number;
  overtimeIncreaseBps?: number;
}

export interface SimulateEmployeeInput extends EmployeeCompensation {
  overtimeKobo?: Kobo;
}

export function applySimulateOptions(
  compensation: SimulateEmployeeInput,
  options: SimulateOptions
): { compensation: EmployeeCompensation; adjustments: PayrollAdjustments } {
  const bps = Math.max(0, options.salaryIncreaseBps ?? 0);
  const transportBump = nairaToKobo(options.transportIncreaseNaira ?? 0);
  const overtimeBps = Math.max(0, options.overtimeIncreaseBps ?? 0);
  const overtimeBase = compensation.overtimeKobo ?? 0n;
  const overtimeKobo =
    overtimeBps > 0 ? applyRateBps(overtimeBase, 10000 + overtimeBps) : overtimeBase;

  return {
    compensation: {
      basicSalaryKobo: bump(compensation.basicSalaryKobo, bps),
      housingAllowanceKobo: bump(compensation.housingAllowanceKobo, bps),
      transportAllowanceKobo:
        bump(compensation.transportAllowanceKobo, bps) + transportBump,
      otherTaxableAllowancesKobo: bump(
        compensation.otherTaxableAllowancesKobo,
        bps
      ),
      nonTaxableReimbursementsKobo: compensation.nonTaxableReimbursementsKobo,
      annualRentKobo: compensation.annualRentKobo,
    },
    adjustments: { bonusKobo: overtimeKobo },
  };
}

function bump(amount: Kobo, increaseBps: number): Kobo {
  if (increaseBps <= 0) return amount;
  return applyRateBps(amount, 10000 + increaseBps);
}

export function extraHireCompensation(monthlyGrossNaira: number): EmployeeCompensation {
  const gross = nairaToKobo(Math.max(0, monthlyGrossNaira));
  const basic = applyRateBps(gross, 6000);
  const housing = applyRateBps(gross, 2500);
  const transport = applyRateBps(gross, 1500);
  return {
    basicSalaryKobo: basic,
    housingAllowanceKobo: housing,
    transportAllowanceKobo: transport,
    otherTaxableAllowancesKobo: 0n,
    nonTaxableReimbursementsKobo: 0n,
  };
}

export function simulatePayrollImpact(
  employees: SimulateEmployeeInput[],
  config: StatutoryConfigInput,
  period: PayrollPeriod,
  options: SimulateOptions = {}
) {
  const baseline = totalsFor(employees, config, period, {});
  const scenarioEmployees = employees.map((employee) => {
    const next = applySimulateOptions(employee, options);
    return { compensation: next.compensation, adjustments: next.adjustments };
  });

  const extraHires = Math.max(0, Math.floor(options.extraHires ?? 0));
  const extraHireGross = options.extraHireMonthlyGrossNaira ?? 0;
  for (let i = 0; i < extraHires; i += 1) {
    scenarioEmployees.push({
      compensation: extraHireCompensation(extraHireGross),
      adjustments: {},
    });
  }

  const scenario = totalsForMapped(scenarioEmployees, config, period);
  return {
    employeeCount: employees.length,
    extraHires,
    baseline,
    scenario,
    variance: {
      grossPayKobo: scenario.grossPayKobo - baseline.grossPayKobo,
      netPayKobo: scenario.netPayKobo - baseline.netPayKobo,
      payeKobo: scenario.payeKobo - baseline.payeKobo,
      pensionEmployeeKobo:
        scenario.pensionEmployeeKobo - baseline.pensionEmployeeKobo,
      pensionEmployerKobo:
        scenario.pensionEmployerKobo - baseline.pensionEmployerKobo,
      employerCostKobo: scenario.employerCostKobo - baseline.employerCostKobo,
    },
  };
}

function totalsFor(
  employees: SimulateEmployeeInput[],
  config: StatutoryConfigInput,
  period: PayrollPeriod,
  options: SimulateOptions
) {
  return totalsForMapped(
    employees.map((employee) => applySimulateOptions(employee, options)),
    config,
    period
  );
}

function totalsForMapped(
  rows: Array<{
    compensation: EmployeeCompensation;
    adjustments: PayrollAdjustments;
  }>,
  config: StatutoryConfigInput,
  period: PayrollPeriod
) {
  let grossPayKobo = 0n;
  let netPayKobo = 0n;
  let payeKobo = 0n;
  let pensionEmployeeKobo = 0n;
  let pensionEmployerKobo = 0n;
  let employerCostKobo = 0n;

  for (const row of rows) {
    const breakdown = calculatePayroll(
      row.compensation,
      config,
      period,
      row.adjustments
    );
    grossPayKobo += breakdown.earnings.grossPayKobo;
    netPayKobo += breakdown.netPayKobo;
    payeKobo += breakdown.deductions.payeKobo;
    pensionEmployeeKobo += breakdown.deductions.pensionEmployeeKobo;
    pensionEmployerKobo += breakdown.employerCosts.pensionEmployerKobo;
    employerCostKobo += breakdown.employerCosts.totalEmployerCostKobo;
  }

  return {
    grossPayKobo,
    netPayKobo,
    payeKobo,
    pensionEmployeeKobo,
    pensionEmployerKobo,
    employerCostKobo,
  };
}
