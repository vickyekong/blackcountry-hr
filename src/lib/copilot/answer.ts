import { subDays, addDays } from "date-fns";
import { prisma } from "@/lib/db";
import type { UserRole } from "@prisma/client";
import { employeeFullName, formatCurrency, getMonthName } from "@/lib/utils";
import { loadWorkforceAnalytics } from "@/lib/reports/load-analytics";
import { sumPayslipCosts } from "@/lib/reports/payroll-costs";
import { startOfYear } from "@/lib/reports/people-analytics";
import { utcWeekStart } from "@/lib/timesheets/period";
import { isOverdue } from "@/lib/automation/playbooks";
import { remainingKobo, loanRepaymentTotalKobo } from "@/lib/payroll/money-math";
import { mapStatutoryConfig } from "@/lib/payroll/config-mapper";
import { simulatePayrollImpact } from "@/lib/payroll/simulate";
import { getStaffIntelligence } from "@/lib/intelligence/staff-insights";
import { enrichGoal, weightedAchievement } from "@/lib/performance/kpis";
import {
  parseCopilotQuestion,
} from "@/lib/copilot/intents";
import {
  canAskIntent,
  deniedMessage,
  suggestedPromptsForRole,
} from "@/lib/copilot/scope";
import type { CopilotAnswer } from "@/lib/copilot/types";

export type { CopilotAnswer, CopilotRow } from "@/lib/copilot/types";

const ACTIVE = { notIn: ["FIRED", "RESIGNED"] as const };
const POST_APPROVAL = [
  "APPROVED",
  "FORWARDED_TO_FINANCE",
  "PROCESSING",
  "PAID",
] as const;

function nameOf(row: { firstName: string; lastName: string; employeeCode?: string }) {
  const name = employeeFullName(row.firstName, row.lastName);
  return row.employeeCode ? `${name} · ${row.employeeCode}` : name;
}

function unknownAnswer(role: UserRole): CopilotAnswer {
  const prompts = suggestedPromptsForRole(role).slice(0, 4);
  return {
    intent: "unknown",
    title: "I answer from this company's live records",
    body:
      prompts.length > 0
        ? `Try one of these, or rephrase: ${prompts.join(" · ")}`
        : "This seat cannot open company-wide questions.",
    rows: [],
  };
}

export async function answerCopilotQuestion(options: {
  companyId: string;
  role: UserRole;
  question: string;
  now?: Date;
}): Promise<CopilotAnswer> {
  const now = options.now ?? new Date();
  const parsed = parseCopilotQuestion(options.question);
  if (parsed.intent === "unknown") {
    return unknownAnswer(options.role);
  }
  if (!canAskIntent(options.role, parsed.intent)) {
    return {
      intent: parsed.intent,
      title: "That stays in its own portal",
      body: deniedMessage(parsed.intent),
      rows: [],
    };
  }

  switch (parsed.intent) {
    case "late_repeat":
      return lateRepeat(options.companyId, parsed.lateMin, now);
    case "dept_payroll_cost":
      return deptPayrollCost(options.companyId, now);
    case "payroll_why_up":
      return payrollWhyUp(options.companyId);
    case "contract_expiry":
      return contractExpiry(options.companyId, parsed.expiryDays, now);
    case "outstanding_loans":
      return outstandingLoans(options.companyId);
    case "missing_timesheets":
      return missingTimesheets(options.companyId, now);
    case "turnover":
      return turnover(options.companyId, now);
    case "salary_simulate":
      return salarySimulate(options.companyId, parsed.salaryIncreaseBps, now);
    case "dept_overtime":
      return deptOvertime(options.companyId, now);
    case "declining_performance":
      return decliningPerformance(options.companyId, now);
    case "briefing":
      return briefing(options.companyId);
    default:
      return unknownAnswer(options.role);
  }
}

async function lateRepeat(
  companyId: string,
  lateMin: number,
  now: Date
): Promise<CopilotAnswer> {
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const rows = await prisma.attendanceDay.findMany({
    where: {
      companyId,
      status: "LATE",
      workDate: { gte: from, lte: now },
    },
    select: {
      employeeId: true,
      employee: {
        select: { firstName: true, lastName: true, employeeCode: true },
      },
    },
  });
  const counts = new Map<
    string,
    { count: number; employee: { firstName: string; lastName: string; employeeCode: string } }
  >();
  for (const row of rows) {
    const cur = counts.get(row.employeeId);
    if (cur) cur.count += 1;
    else counts.set(row.employeeId, { count: 1, employee: row.employee });
  }
  const hits = Array.from(counts.values())
    .filter((row) => row.count >= lateMin)
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  if (rows.length === 0) {
    return {
      intent: "late_repeat",
      title: "No clock lateness this month",
      body: "There are no AttendanceDay rows yet. Timesheets remain the source of hours for payroll — import a clock file if you want lateness.",
      href: "/reports?tab=time",
      rows: [],
    };
  }

  return {
    intent: "late_repeat",
    title:
      hits.length === 0
        ? `Nobody is at ${lateMin}+ late days this month`
        : `${hits.length} people late ${lateMin}+ times this month`,
    body: "Clock lateness does not change pay. Weekly timesheets still drive payroll hours.",
    href: "/reports?tab=time",
    rows: hits.map((row) => ({
      label: nameOf(row.employee),
      detail: `${row.count} late days`,
    })),
  };
}

async function deptPayrollCost(
  companyId: string,
  now: Date
): Promise<CopilotAnswer> {
  const data = await loadWorkforceAnalytics(companyId, now.getFullYear());
  const ranked = [...data.costs.byDepartment].sort((a, b) => {
    const av = BigInt(a.payrollEmployerKobo);
    const bv = BigInt(b.payrollEmployerKobo);
    if (bv > av) return 1;
    if (bv < av) return -1;
    return 0;
  });
  const top = ranked[0];
  if (!top || BigInt(top.payrollEmployerKobo) === 0n) {
    return {
      intent: "dept_payroll_cost",
      title: "No cleared payroll to split by department yet",
      body: "Approve a run and this answer uses employer cost (gross + employer pension + NSITF).",
      href: "/reports?tab=costs",
      rows: [],
    };
  }
  return {
    intent: "dept_payroll_cost",
    title: `${top.department} is the highest payroll cost this year`,
    body: `Employer cost ${formatCurrency(top.payrollEmployerKobo)} on cleared runs in ${now.getFullYear()}. Same basis as Reports → Costs.`,
    href: "/reports?tab=costs",
    rows: ranked.slice(0, 8).map((row) => ({
      label: row.department,
      detail: formatCurrency(row.payrollEmployerKobo),
    })),
  };
}

async function payrollWhyUp(companyId: string): Promise<CopilotAnswer> {
  const runs = await prisma.payrollRun.findMany({
    where: { companyId, status: { in: [...POST_APPROVAL] } },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    take: 2,
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
        },
      },
    },
  });
  if (runs.length === 0) {
    return {
      intent: "payroll_why_up",
      title: "No cleared payroll run yet",
      body: "Once Super Admin clears a run, I can compare gross, headcount, and employer cost.",
      href: "/payroll",
      rows: [],
    };
  }
  const latest = runs[0];
  const prior = runs[1];
  const latestSum = sumPayslipCosts(latest.payslips);
  const latestLabel = `${getMonthName(latest.periodMonth)} ${latest.periodYear}`;
  if (!prior) {
    return {
      intent: "payroll_why_up",
      title: `${latestLabel} is the only cleared run`,
      body: `Gross ${formatCurrency(latestSum.grossPayKobo)} · net ${formatCurrency(latestSum.netPayKobo)} · ${latestSum.headcount} slips. A second run is needed to explain a change.`,
      href: `/payroll/${latest.id}`,
      rows: [],
    };
  }
  const priorSum = sumPayslipCosts(prior.payslips);
  const priorLabel = `${getMonthName(prior.periodMonth)} ${prior.periodYear}`;
  const grossDelta = latestSum.grossPayKobo - priorSum.grossPayKobo;
  const headDelta = latestSum.headcount - priorSum.headcount;
  const costDelta = latestSum.employerCostKobo - priorSum.employerCostKobo;
  const direction =
    grossDelta > 0n ? "up" : grossDelta < 0n ? "down" : "unchanged";
  const reasons: string[] = [];
  if (headDelta !== 0) {
    reasons.push(
      `headcount ${headDelta > 0 ? "+" : ""}${headDelta} slips (${priorSum.headcount} → ${latestSum.headcount})`
    );
  }
  reasons.push(
    `gross ${grossDelta === 0n ? "flat" : formatCurrency(grossDelta)} vs ${priorLabel}`
  );
  return {
    intent: "payroll_why_up",
    title: `${latestLabel} payroll is ${direction} vs ${priorLabel}`,
    body: `This uses the same PAYE engine totals as the payslips — not a forecast. ${reasons.join("; ")}.`,
    href: `/payroll/${latest.id}`,
    rows: [
      {
        label: latestLabel,
        detail: `Gross ${formatCurrency(latestSum.grossPayKobo)} · ${latestSum.headcount} slips`,
      },
      {
        label: priorLabel,
        detail: `Gross ${formatCurrency(priorSum.grossPayKobo)} · ${priorSum.headcount} slips`,
      },
      {
        label: "Employer cost change",
        detail: formatCurrency(costDelta),
      },
    ],
  };
}

async function contractExpiry(
  companyId: string,
  expiryDays: number,
  now: Date
): Promise<CopilotAnswer> {
  const from = subDays(now, 14);
  const until = addDays(now, expiryDays);
  const rows = await prisma.employee.findMany({
    where: {
      companyId,
      employmentType: "CONTRACT",
      status: ACTIVE,
      endDate: { gte: from, lte: until },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      employeeCode: true,
      endDate: true,
    },
    orderBy: { endDate: "asc" },
    take: 20,
  });
  const due = rows.filter((row) => row.endDate);
  return {
    intent: "contract_expiry",
    title:
      due.length === 0
        ? `No contracts ending in the next ${expiryDays} days`
        : `${due.length} contract${due.length === 1 ? "" : "s"} ending within ${expiryDays} days`,
    body: "Contract end dates on the employee record — not a legal notice generator.",
    href: "/employees",
    rows: due.slice(0, 12).map((row) => ({
      label: nameOf(row),
      detail: row.endDate
        ? isOverdue(row.endDate, now)
          ? "Already ended"
          : `Ends ${row.endDate.toISOString().slice(0, 10)}`
        : "",
    })),
  };
}

async function outstandingLoans(companyId: string): Promise<CopilotAnswer> {
  const loans = await prisma.salaryLoan.findMany({
    where: { companyId, status: "APPROVED" },
    include: {
      employee: {
        select: { firstName: true, lastName: true, employeeCode: true },
      },
      charges: { include: { payrollRun: { select: { status: true } } } },
    },
    take: 40,
  });
  const open = loans
    .map((loan) => {
      const total = loanRepaymentTotalKobo(loan.principalKobo, loan.interestKobo);
      const left = remainingKobo(
        total,
        loan.charges.map((c) => ({
          amountKobo: c.amountKobo,
          runStatus: c.payrollRun.status,
        }))
      );
      return { loan, left };
    })
    .filter((row) => row.left > 0n)
    .sort((a, b) => (a.left < b.left ? 1 : -1));

  return {
    intent: "outstanding_loans",
    title:
      open.length === 0
        ? "No approved loans with a remaining balance"
        : `${open.length} staff loan${open.length === 1 ? "" : "s"} still attaching on payroll`,
    body: "Remaining is principal + interest minus charges on cleared runs. Open Payroll → Loans to change a loan.",
    href: "/payroll?tab=loans",
    rows: open.slice(0, 12).map((row) => ({
      label: nameOf(row.loan.employee),
      detail: formatCurrency(row.left),
    })),
  };
}

async function missingTimesheets(
  companyId: string,
  now: Date
): Promise<CopilotAnswer> {
  const weekStart = utcWeekStart(subDays(now, 7));
  const staff = await prisma.employee.findMany({
    where: {
      companyId,
      employmentType: "FULL_TIME",
      status: ACTIVE,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      employeeCode: true,
    },
  });
  const weeks = await prisma.timesheetWeek.findMany({
    where: {
      companyId,
      weekStart,
      status: { in: ["SUBMITTED", "VALIDATED"] },
    },
    select: { employeeId: true },
  });
  const submitted = new Set(weeks.map((w) => w.employeeId));
  const missing = staff.filter((s) => !submitted.has(s.id)).slice(0, 12);
  const label = weekStart.toISOString().slice(0, 10);
  return {
    intent: "missing_timesheets",
    title:
      missing.length === 0
        ? "Every full-time person submitted last week's timesheet"
        : `${missing.length} full-time staff missing last week's timesheet`,
    body: `Week starting ${label}. Validated hours are the source of time for payroll — not the clock.`,
    href: "/timesheets",
    rows: missing.map((row) => ({
      label: nameOf(row),
      detail: "No submitted or validated week",
    })),
  };
}

async function turnover(companyId: string, now: Date): Promise<CopilotAnswer> {
  const year = now.getFullYear();
  const data = await loadWorkforceAnalytics(companyId, year);
  return {
    intent: "turnover",
    title: `Turnover ${data.people.turnoverPercent}% in ${year}`,
    body: `Exits ÷ average monthly headcount. ${data.people.exits} exits (voluntary ${data.people.voluntaryExits}, involuntary ${data.people.involuntaryExits}) against average headcount ${data.people.averageHeadcount}. Live headcount is ${data.people.currentHeadcount}.`,
    href: "/reports?tab=people",
    rows: [
      { label: "Hires this year", detail: String(data.people.hires) },
      { label: "Exits this year", detail: String(data.people.exits) },
    ],
  };
}

async function salarySimulate(
  companyId: string,
  salaryIncreaseBps: number,
  now: Date
): Promise<CopilotAnswer> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { statutoryConfig: true, taxBands: true },
  });
  const config = mapStatutoryConfig(
    company?.statutoryConfig ?? null,
    company?.taxBands
  );
  const employees = await prisma.employee.findMany({
    where: { companyId, status: "ACTIVE" },
    select: {
      basicSalaryKobo: true,
      housingAllowanceKobo: true,
      transportAllowanceKobo: true,
      otherTaxableAllowancesKobo: true,
      nonTaxableReimbursementsKobo: true,
      annualRentKobo: true,
    },
  });
  const pct = salaryIncreaseBps / 100;
  const result = simulatePayrollImpact(
    employees,
    config,
    { month: now.getMonth() + 1, year: now.getFullYear() },
    { salaryIncreaseBps }
  );
  return {
    intent: "salary_simulate",
    title: `A ${pct}% salary lift on the current engine`,
    body: `What-if only — it does not change payslips. Uses the same PAYE NTA2025 calculator as Payroll → Simulate, on ${result.employeeCount} active staff.`,
    href: "/payroll",
    rows: [
      {
        label: "Gross",
        detail: `${formatCurrency(result.baseline.grossPayKobo)} → ${formatCurrency(result.scenario.grossPayKobo)} (${formatCurrency(result.variance.grossPayKobo)})`,
      },
      {
        label: "Net",
        detail: `${formatCurrency(result.baseline.netPayKobo)} → ${formatCurrency(result.scenario.netPayKobo)} (${formatCurrency(result.variance.netPayKobo)})`,
      },
      {
        label: "PAYE",
        detail: `${formatCurrency(result.baseline.payeKobo)} → ${formatCurrency(result.scenario.payeKobo)} (${formatCurrency(result.variance.payeKobo)})`,
      },
      {
        label: "Employer cost",
        detail: `${formatCurrency(result.baseline.employerCostKobo)} → ${formatCurrency(result.scenario.employerCostKobo)} (${formatCurrency(result.variance.employerCostKobo)})`,
      },
    ],
  };
}

async function deptOvertime(
  companyId: string,
  now: Date
): Promise<CopilotAnswer> {
  const from = startOfYear(now.getFullYear());
  const rows = await prisma.overtimeRequest.findMany({
    where: {
      companyId,
      status: "APPROVED",
      workDate: { gte: from, lte: now },
    },
    select: {
      minutes: true,
      amountKobo: true,
      employee: { select: { department: true } },
    },
  });
  const map = new Map<string, { minutes: number; kobo: bigint }>();
  for (const row of rows) {
    const dept = row.employee.department || "Unknown";
    const cur = map.get(dept) ?? { minutes: 0, kobo: 0n };
    cur.minutes += row.minutes;
    if (row.amountKobo) cur.kobo += row.amountKobo;
    map.set(dept, cur);
  }
  const ranked = Array.from(map.entries())
    .map(([department, v]) => ({ department, ...v }))
    .sort((a, b) => b.minutes - a.minutes);
  if (ranked.length === 0) {
    return {
      intent: "dept_overtime",
      title: "No approved overtime this year",
      body: "Approved overtime attaches on the draft payroll run. Staff log it from Timesheets.",
      href: "/timesheets?tab=overtime",
      rows: [],
    };
  }
  const top = ranked[0];
  return {
    intent: "dept_overtime",
    title: `${top.department} has the most approved overtime hours this year`,
    body: "Hours from approved overtime requests — not clock minutes.",
    href: "/timesheets?tab=overtime",
    rows: ranked.slice(0, 8).map((row) => ({
      label: row.department,
      detail: `${Math.round((row.minutes / 60) * 10) / 10}h${
        row.kobo > 0n ? ` · ${formatCurrency(row.kobo)}` : ""
      }`,
    })),
  };
}

async function decliningPerformance(
  companyId: string,
  now: Date
): Promise<CopilotAnswer> {
  const year = now.getFullYear();
  const goals = await prisma.performanceGoal.findMany({
    where: {
      companyId,
      periodYear: year,
      scope: "INDIVIDUAL",
      employeeId: { not: null },
    },
    include: {
      employee: {
        select: { firstName: true, lastName: true, employeeCode: true },
      },
    },
  });
  const byEmployee = new Map<
    string,
    {
      employee: { firstName: string; lastName: string; employeeCode: string };
      goals: typeof goals;
    }
  >();
  for (const goal of goals) {
    if (!goal.employeeId || !goal.employee) continue;
    const cur = byEmployee.get(goal.employeeId);
    if (cur) cur.goals.push(goal);
    else
      byEmployee.set(goal.employeeId, {
        employee: goal.employee,
        goals: [goal],
      });
  }
  const behind = Array.from(byEmployee.values())
    .map((row) => ({
      employee: row.employee,
      pct: weightedAchievement(row.goals.map((g) => enrichGoal(g))),
    }))
    .filter((row) => row.pct != null && row.pct < 80)
    .sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0));

  if (behind.length === 0) {
    const numeric = Array.from(byEmployee.values()).filter(
      (row) => weightedAchievement(row.goals.map((g) => enrichGoal(g))) != null
    ).length;
    return {
      intent: "declining_performance",
      title:
        numeric === 0
          ? "No numeric KPI actuals to rank this year"
          : "Nobody is under 80% weighted KPI achievement",
      body: "Reviews do not change payroll. Add numeric targets and actuals on Performance → Goals.",
      href: "/performance",
      rows: [],
    };
  }
  return {
    intent: "declining_performance",
    title: `${behind.length} people under 80% KPI achievement this year`,
    body: "Weighted actual ÷ target on individual goals. This does not change pay.",
    href: "/performance",
    rows: behind.slice(0, 12).map((row) => ({
      label: nameOf(row.employee),
      detail: `${row.pct}% of target`,
    })),
  };
}

async function briefing(companyId: string): Promise<CopilotAnswer> {
  const intelligence = await getStaffIntelligence(companyId);
  return {
    intent: "briefing",
    title: "What to watch",
    body: intelligence.briefing,
    href: "/dashboard",
    rows: intelligence.insights.slice(0, 6).map((insight) => ({
      label: insight.title,
      detail: insight.detail,
    })),
  };
}
