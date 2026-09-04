import { prisma } from "@/lib/db";
import { serializeBigInts } from "@/lib/payroll/config-mapper";
import { employeeStatusLabel, employeeSexLabel } from "@/lib/employees/status";
import { STANDARD_HOURS_PER_DAY } from "@/lib/payroll/timesheet-pay";
import {
  attendanceRate,
  averageHeadcount,
  countBy,
  currentHeadcount,
  departmentPeople,
  employedOn,
  endOfYear,
  exitsInRange,
  hiresInRange,
  hoursFromMinutes,
  monthlyHeadcountSeries,
  overlapDays,
  startOfYear,
  turnoverRate,
  type AnalyticsPerson,
} from "@/lib/reports/people-analytics";
import {
  mergePayrollMonth,
  sumPayslipCosts,
  type PayrollMonthPoint,
} from "@/lib/reports/payroll-costs";

const POST_APPROVAL = [
  "APPROVED",
  "FORWARDED_TO_FINANCE",
  "PROCESSING",
  "PAID",
] as const;

export async function loadWorkforceAnalytics(
  companyId: string,
  year: number
) {
  const from = startOfYear(year);
  const to = endOfYear(year);
  const asOf = new Date();

  const employees = await prisma.employee.findMany({
    where: { companyId },
    select: {
      id: true,
      department: true,
      status: true,
      sex: true,
      startDate: true,
      endDate: true,
    },
  });
  const people: AnalyticsPerson[] = employees.map((row) => ({
    ...row,
    sex: row.sex,
  }));

  const series = monthlyHeadcountSeries(people, year);
  const yearHires = hiresInRange(people, from, to);
  const yearExits = exitsInRange(people, from, to);
  const currentPeople = people.filter((p) => employedOn(p, asOf));
  const current = currentHeadcount(people, asOf);
  const avg = averageHeadcount(series);

  const runs = await prisma.payrollRun.findMany({
    where: {
      companyId,
      periodYear: year,
      status: { in: [...POST_APPROVAL] },
    },
    include: {
      payslips: {
        select: {
          grossPayKobo: true,
          netPayKobo: true,
          payeKobo: true,
          pensionEmployeeKobo: true,
          pensionEmployerKobo: true,
          nhfKobo: true,
          nsitfKobo: true,
          employee: { select: { department: true } },
        },
      },
      adjustments: {
        where: { type: "OVERTIME" },
        select: { amountKobo: true },
      },
    },
    orderBy: { periodMonth: "asc" },
  });

  const monthMap = new Map<number, PayrollMonthPoint>();
  const deptPayroll = new Map<
    string,
    { department: string; employerCostKobo: bigint; grossKobo: bigint; count: number }
  >();
  let overtimePayrollKobo = 0n;
  for (const run of runs) {
    const slips = run.payslips;
    const merged = mergePayrollMonth(
      monthMap.get(run.periodMonth),
      run.periodMonth,
      year,
      slips
    );
    monthMap.set(run.periodMonth, merged);
    for (const slip of slips) {
      const department = slip.employee.department || "Unknown";
      const row = deptPayroll.get(department) ?? {
        department,
        employerCostKobo: 0n,
        grossKobo: 0n,
        count: 0,
      };
      row.employerCostKobo +=
        slip.grossPayKobo + slip.pensionEmployerKobo + slip.nsitfKobo;
      row.grossKobo += slip.grossPayKobo;
      row.count += 1;
      deptPayroll.set(department, row);
    }
    for (const line of run.adjustments) {
      overtimePayrollKobo +=
        line.amountKobo < 0n ? -line.amountKobo : line.amountKobo;
    }
  }
  const payrollYear = sumPayslipCosts(
    runs.flatMap((run) => run.payslips)
  );
  const payrollTrend = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const point = monthMap.get(month);
    return {
      month,
      year,
      grossPayKobo: (point?.grossPayKobo ?? 0n).toString(),
      netPayKobo: (point?.netPayKobo ?? 0n).toString(),
      payeKobo: (point?.payeKobo ?? 0n).toString(),
      pensionEmployeeKobo: (point?.pensionEmployeeKobo ?? 0n).toString(),
      pensionEmployerKobo: (point?.pensionEmployerKobo ?? 0n).toString(),
      nhfKobo: (point?.nhfKobo ?? 0n).toString(),
      nsitfKobo: (point?.nsitfKobo ?? 0n).toString(),
      employerCostKobo: (point?.employerCostKobo ?? 0n).toString(),
      headcount: point?.headcount ?? 0,
    };
  });

  const [entries, weeks, leave, days, expenses, benefits, overtimeReqs] =
    await Promise.all([
      prisma.timesheetEntry.findMany({
        where: {
          companyId,
          workDate: { gte: from, lte: to },
          status: "APPROVED",
        },
        select: {
          minutes: true,
          employee: { select: { department: true } },
        },
      }),
      prisma.timesheetWeek.findMany({
        where: { companyId, weekStart: { gte: from, lte: to } },
        select: { status: true },
      }),
      prisma.leaveRequest.findMany({
        where: {
          status: "APPROVED",
          employee: { companyId },
          startDate: { lte: to },
          endDate: { gte: from },
        },
        select: {
          type: true,
          startDate: true,
          endDate: true,
          days: true,
        },
      }),
      prisma.attendanceDay.findMany({
        where: { companyId, workDate: { gte: from, lte: to } },
        select: {
          status: true,
          lateMinutes: true,
          employee: { select: { department: true } },
        },
      }),
      prisma.expenseClaim.findMany({
        where: {
          companyId,
          status: "REIMBURSED",
          reimbursedAt: { gte: from, lte: to },
        },
        select: {
          approvedAmountKobo: true,
          amountKobo: true,
          employee: { select: { department: true } },
        },
      }),
      prisma.employeeBenefit.findMany({
        where: {
          status: "ACTIVE",
          employee: { companyId },
        },
        select: {
          plan: { select: { employerCostKobo: true } },
        },
      }),
      prisma.overtimeRequest.findMany({
        where: {
          companyId,
          status: "APPROVED",
          workDate: { gte: from, lte: to },
        },
        select: { minutes: true, amountKobo: true },
      }),
    ]);

  const hoursByDept = new Map<string, number>();
  let approvedMinutes = 0;
  for (const row of entries) {
    approvedMinutes += row.minutes;
    const dept = row.employee.department || "Unknown";
    hoursByDept.set(dept, (hoursByDept.get(dept) ?? 0) + row.minutes);
  }

  const leaveByType = new Map<string, number>();
  let leaveDays = 0;
  for (const row of leave) {
    const daysCount = overlapDays(row.startDate, row.endDate, from, to);
    leaveDays += daysCount;
    leaveByType.set(row.type, (leaveByType.get(row.type) ?? 0) + daysCount);
  }

  const clockByStatus = countBy(days, (d) => d.status);
  const presentDays = days.filter(
    (d) => d.status === "PRESENT" || d.status === "LATE" || d.status === "PARTIAL"
  ).length;
  const absentDays = days.filter((d) => d.status === "ABSENT").length;
  const lateDays = days.filter((d) => d.status === "LATE").length;
  const lateMinutes = days.reduce((acc, d) => acc + d.lateMinutes, 0);

  let expenseKobo = 0n;
  const expenseByDept = new Map<string, bigint>();
  for (const row of expenses) {
    const amount =
      row.approvedAmountKobo > 0n ? row.approvedAmountKobo : row.amountKobo;
    expenseKobo += amount;
    const dept = row.employee.department || "Unknown";
    expenseByDept.set(dept, (expenseByDept.get(dept) ?? 0n) + amount);
  }

  let benefitsMonthlyKobo = 0n;
  for (const row of benefits) {
    benefitsMonthlyKobo += row.plan.employerCostKobo;
  }

  let overtimeRequestMinutes = 0;
  let overtimeRequestKobo = 0n;
  for (const row of overtimeReqs) {
    overtimeRequestMinutes += row.minutes;
    if (row.amountKobo) overtimeRequestKobo += row.amountKobo;
  }

  const departmentCosts = Array.from(deptPayroll.values()).map((row) => ({
    department: row.department,
    payrollEmployerKobo: row.employerCostKobo.toString(),
    expenseKobo: (expenseByDept.get(row.department) ?? 0n).toString(),
    timesheetHours: hoursFromMinutes(hoursByDept.get(row.department) ?? 0),
  }));
  for (const [department, amount] of expenseByDept) {
    if (!deptPayroll.has(department)) {
      departmentCosts.push({
        department,
        payrollEmployerKobo: "0",
        expenseKobo: amount.toString(),
        timesheetHours: hoursFromMinutes(hoursByDept.get(department) ?? 0),
      });
    }
  }
  departmentCosts.sort((a, b) => a.department.localeCompare(b.department));

  return serializeBigInts({
    year,
    people: {
      currentHeadcount: current,
      hires: yearHires.length,
      exits: yearExits.length,
      voluntaryExits: yearExits.filter((p) => p.status === "RESIGNED").length,
      involuntaryExits: yearExits.filter((p) => p.status === "FIRED").length,
      averageHeadcount: Math.round(avg * 10) / 10,
      turnoverPercent: turnoverRate(yearExits.length, avg),
      byStatus: countBy(currentPeople, (p) => p.status).map((row) => ({
        ...row,
        label: employeeStatusLabel(row.key),
      })),
      bySex: countBy(currentPeople, (p) => p.sex ?? "UNSPECIFIED").map((row) => ({
        ...row,
        label:
          row.key === "UNSPECIFIED" ? "Unspecified" : employeeSexLabel(row.key),
      })),
      byDepartment: departmentPeople(people, year, asOf),
      monthly: series,
    },
    time: {
      approvedHours: hoursFromMinutes(approvedMinutes),
      hoursByDepartment: Array.from(hoursByDept.entries())
        .map(([department, minutes]) => ({
          department,
          hours: hoursFromMinutes(minutes),
        }))
        .sort((a, b) => b.hours - a.hours),
      weeks: countBy(weeks, (w) => w.status),
      leaveDays,
      leaveByType: Array.from(leaveByType.entries()).map(([type, daysCount]) => ({
        type,
        days: daysCount,
      })),
      clock: {
        hasData: days.length > 0,
        presentDays,
        absentDays,
        lateDays,
        lateHours: hoursFromMinutes(lateMinutes),
        attendanceRate: attendanceRate(presentDays, absentDays),
        byStatus: clockByStatus,
      },
      overtimeRequestHours: hoursFromMinutes(overtimeRequestMinutes),
      expectedHoursNote: `${STANDARD_HOURS_PER_DAY}h/day is the payroll standard day`,
    },
    costs: {
      payroll: {
        ...Object.fromEntries(
          Object.entries(payrollYear).map(([k, v]) => [
            k,
            typeof v === "bigint" ? v.toString() : v,
          ])
        ),
        runCount: runs.length,
      },
      overtimePayrollKobo: overtimePayrollKobo.toString(),
      overtimeRequestKobo: overtimeRequestKobo.toString(),
      benefitsMonthlyKobo: benefitsMonthlyKobo.toString(),
      expenseKobo: expenseKobo.toString(),
      trend: payrollTrend,
      byDepartment: departmentCosts,
    },
  });
}
