import type { PayrollRun } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DEFAULT_WORKING_DAYS_PER_MONTH } from "@/lib/payroll/calculate-payroll";
import { localDateKey } from "@/lib/time/dates";
import {
  overtimeKobo,
  overtimeMultiplierBps,
} from "@/lib/time/overtime-math";

export {
  WEEKDAY_OVERTIME_BPS,
  HOLIDAY_OVERTIME_BPS,
  overtimeKobo,
  overtimeMultiplierBps,
} from "@/lib/time/overtime-math";

export async function quoteOvertimeKobo(options: {
  companyId: string;
  employeeId: string;
  workDate: Date;
  minutes: number;
  workingDaysPerMonth?: number;
}): Promise<bigint> {
  const employee = await prisma.employee.findFirst({
    where: { id: options.employeeId, companyId: options.companyId },
    select: { basicSalaryKobo: true },
  });
  if (!employee) return 0n;
  const holiday = await prisma.companyHoliday.findFirst({
    where: {
      companyId: options.companyId,
      workDate: {
        gte: new Date(
          options.workDate.getFullYear(),
          options.workDate.getMonth(),
          options.workDate.getDate(),
          0,
          0,
          0,
          0
        ),
        lt: new Date(
          options.workDate.getFullYear(),
          options.workDate.getMonth(),
          options.workDate.getDate() + 1,
          0,
          0,
          0,
          0
        ),
      },
    },
    select: { id: true },
  });
  return overtimeKobo({
    monthlyBasicKobo: employee.basicSalaryKobo,
    workingDaysPerMonth:
      options.workingDaysPerMonth ?? DEFAULT_WORKING_DAYS_PER_MONTH,
    minutes: options.minutes,
    multiplierBps: overtimeMultiplierBps({
      workDate: options.workDate,
      holiday: Boolean(holiday),
    }),
  });
}

function overtimeAdjustmentDescription(workDate: Date, minutes: number) {
  return `Overtime ${localDateKey(workDate)} (${minutes} min)`;
}

/**
 * Attach approved overtime in the run period as OVERTIME payroll lines.
 * Does not change PAYE math — adjustments already feed calculatePayroll.
 */
export async function attachApprovedOvertimeToDraftRun(options: {
  run: Pick<PayrollRun, "id" | "companyId" | "periodMonth" | "periodYear" | "status">;
  workingDaysPerMonth?: number;
}) {
  if (options.run.status !== "DRAFT") return { attached: 0 };

  const workingDays =
    options.workingDaysPerMonth ?? DEFAULT_WORKING_DAYS_PER_MONTH;
  const periodStart = new Date(
    options.run.periodYear,
    options.run.periodMonth - 1,
    1,
    0,
    0,
    0,
    0
  );
  const periodEnd = new Date(
    options.run.periodYear,
    options.run.periodMonth,
    0,
    23,
    59,
    59,
    999
  );

  const requests = await prisma.overtimeRequest.findMany({
    where: {
      companyId: options.run.companyId,
      status: "APPROVED",
      workDate: { gte: periodStart, lte: periodEnd },
      OR: [{ payrollRunId: null }, { payrollRunId: options.run.id }],
    },
    include: {
      employee: { select: { id: true, basicSalaryKobo: true } },
    },
  });

  const holidays = await prisma.companyHoliday.findMany({
    where: {
      companyId: options.run.companyId,
      workDate: { gte: periodStart, lte: periodEnd },
    },
    select: { workDate: true },
  });
  const holidayKeys = new Set(holidays.map((h) => localDateKey(h.workDate)));

  const existing = await prisma.payrollAdjustment.findMany({
    where: {
      payrollRunId: options.run.id,
      type: "OVERTIME",
    },
    select: { employeeId: true, description: true },
  });
  const existingKeys = new Set(
    existing.map((row) => `${row.employeeId}|${row.description ?? ""}`)
  );

  let attached = 0;
  for (const request of requests) {
    const description = overtimeAdjustmentDescription(
      request.workDate,
      request.minutes
    );
    const key = `${request.employeeId}|${description}`;
    if (existingKeys.has(key)) {
      if (request.payrollRunId !== options.run.id) {
        await prisma.overtimeRequest.update({
          where: { id: request.id },
          data: { payrollRunId: options.run.id },
        });
      }
      continue;
    }

    const amountKobo =
      request.amountKobo && request.amountKobo > 0n
        ? request.amountKobo
        : overtimeKobo({
            monthlyBasicKobo: request.employee.basicSalaryKobo,
            workingDaysPerMonth: workingDays,
            minutes: request.minutes,
            multiplierBps: overtimeMultiplierBps({
              workDate: request.workDate,
              holiday: holidayKeys.has(localDateKey(request.workDate)),
            }),
          });

    if (amountKobo <= 0n) continue;

    await prisma.payrollAdjustment.create({
      data: {
        payrollRunId: options.run.id,
        employeeId: request.employeeId,
        type: "OVERTIME",
        amountKobo,
        description,
      },
    });
    await prisma.overtimeRequest.update({
      where: { id: request.id },
      data: {
        payrollRunId: options.run.id,
        amountKobo,
      },
    });
    existingKeys.add(key);
    attached += 1;
  }

  return { attached };
}

export async function detachOvertimeFromRun(payrollRunId: string) {
  await prisma.payrollAdjustment.deleteMany({
    where: { payrollRunId, type: "OVERTIME" },
  });
  await prisma.overtimeRequest.updateMany({
    where: { payrollRunId },
    data: { payrollRunId: null },
  });
}
