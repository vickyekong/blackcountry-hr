import type { PayrollRun } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ensurePayrollExtrasSchema } from "@/lib/ensure-payroll-extras-schema";
import {
  AUTO_ADVANCE_PREFIX,
  AUTO_BENEFIT_PREFIX,
  AUTO_DEDUCTION_PREFIX,
  AUTO_LOAN_PREFIX,
  advanceAdjustmentDescription,
  benefitAdjustmentDescription,
  deductionAdjustmentDescription,
  deductionAdjustmentType,
  loanAdjustmentDescription,
  loanRepaymentTotalKobo,
  nextChargeKobo,
} from "@/lib/payroll/money-math";

/**
 * Attach approved advances, loans, benefit deductions, and recurring
 * deductions as PayrollAdjustment rows. Does not change PAYE math.
 */
export async function attachPayrollMoneyToDraftRun(options: {
  run: Pick<PayrollRun, "id" | "companyId" | "status">;
}) {
  if (options.run.status !== "DRAFT") return { attached: 0 };

  await ensurePayrollExtrasSchema();
  await detachPayrollMoneyFromRun(options.run.id);

  let attached = 0;
  attached += await attachAdvances(options.run);
  attached += await attachLoans(options.run);
  attached += await attachBenefits(options.run);
  attached += await attachDeductions(options.run);
  return { attached };
}

export async function detachPayrollMoneyFromRun(payrollRunId: string) {
  await prisma.payrollAdjustment.deleteMany({
    where: {
      payrollRunId,
      OR: [
        { type: "ADVANCE", description: { startsWith: AUTO_ADVANCE_PREFIX } },
        {
          type: "LOAN_DEDUCTION",
          description: { startsWith: AUTO_LOAN_PREFIX },
        },
        {
          type: "BENEFIT_DEDUCTION",
          description: { startsWith: AUTO_BENEFIT_PREFIX },
        },
        {
          type: "COOPERATIVE",
          description: { startsWith: AUTO_DEDUCTION_PREFIX },
        },
        {
          type: "CUSTOM_DEDUCTION",
          description: { startsWith: AUTO_DEDUCTION_PREFIX },
        },
      ],
    },
  });
  await prisma.salaryAdvanceCharge.deleteMany({ where: { payrollRunId } });
  await prisma.salaryLoanCharge.deleteMany({ where: { payrollRunId } });
}

async function attachAdvances(run: Pick<PayrollRun, "id" | "companyId">) {
  const advances = await prisma.salaryAdvance.findMany({
    where: { companyId: run.companyId, status: "APPROVED" },
    include: {
      charges: { include: { payrollRun: { select: { status: true } } } },
    },
  });

  let attached = 0;
  for (const advance of advances) {
    const amountKobo = nextChargeKobo(
      advance.approvedKobo,
      advance.installments,
      advance.charges.map((c) => ({
        amountKobo: c.amountKobo,
        runStatus: c.payrollRun.status,
      }))
    );
    if (amountKobo <= 0n) {
      if (advance.charges.some((c) => c.payrollRun.status !== "DRAFT")) {
        await prisma.salaryAdvance.update({
          where: { id: advance.id },
          data: { status: "CLEARED" },
        });
      }
      continue;
    }

    await prisma.payrollAdjustment.create({
      data: {
        payrollRunId: run.id,
        employeeId: advance.employeeId,
        type: "ADVANCE",
        amountKobo: -amountKobo,
        description: advanceAdjustmentDescription(advance.id),
      },
    });
    await prisma.salaryAdvanceCharge.create({
      data: {
        advanceId: advance.id,
        payrollRunId: run.id,
        amountKobo,
      },
    });
    attached += 1;
  }
  return attached;
}

async function attachLoans(run: Pick<PayrollRun, "id" | "companyId">) {
  const loans = await prisma.salaryLoan.findMany({
    where: { companyId: run.companyId, status: "APPROVED" },
    include: {
      charges: { include: { payrollRun: { select: { status: true } } } },
    },
  });

  let attached = 0;
  for (const loan of loans) {
    const total = loanRepaymentTotalKobo(loan.principalKobo, loan.interestKobo);
    const amountKobo = nextChargeKobo(
      total,
      loan.installments,
      loan.charges.map((c) => ({
        amountKobo: c.amountKobo,
        runStatus: c.payrollRun.status,
      }))
    );
    if (amountKobo <= 0n) {
      if (loan.charges.some((c) => c.payrollRun.status !== "DRAFT")) {
        await prisma.salaryLoan.update({
          where: { id: loan.id },
          data: { status: "CLEARED" },
        });
      }
      continue;
    }

    await prisma.payrollAdjustment.create({
      data: {
        payrollRunId: run.id,
        employeeId: loan.employeeId,
        type: "LOAN_DEDUCTION",
        amountKobo: -amountKobo,
        description: loanAdjustmentDescription(loan.id),
      },
    });
    await prisma.salaryLoanCharge.create({
      data: {
        loanId: loan.id,
        payrollRunId: run.id,
        amountKobo,
      },
    });
    attached += 1;
  }
  return attached;
}

async function attachBenefits(run: Pick<PayrollRun, "id" | "companyId">) {
  const enrollments = await prisma.employeeBenefit.findMany({
    where: {
      status: "ACTIVE",
      employee: { companyId: run.companyId, status: "ACTIVE" },
      plan: { employeeDeductionKobo: { gt: 0 } },
    },
    include: { plan: true },
  });

  let attached = 0;
  for (const enrollment of enrollments) {
    const amountKobo = enrollment.plan.employeeDeductionKobo;
    if (amountKobo <= 0n) continue;
    await prisma.payrollAdjustment.create({
      data: {
        payrollRunId: run.id,
        employeeId: enrollment.employeeId,
        type: "BENEFIT_DEDUCTION",
        amountKobo: -amountKobo,
        description: benefitAdjustmentDescription(enrollment.planId),
      },
    });
    attached += 1;
  }
  return attached;
}

async function attachDeductions(run: Pick<PayrollRun, "id" | "companyId">) {
  const rows = await prisma.recurringDeduction.findMany({
    where: {
      companyId: run.companyId,
      status: "ACTIVE",
      amountKobo: { gt: 0 },
      employee: { status: "ACTIVE" },
    },
  });

  let attached = 0;
  for (const row of rows) {
    await prisma.payrollAdjustment.create({
      data: {
        payrollRunId: run.id,
        employeeId: row.employeeId,
        type: deductionAdjustmentType(row.kind),
        amountKobo: -row.amountKobo,
        description: deductionAdjustmentDescription(row.id),
      },
    });
    attached += 1;
  }
  return attached;
}
