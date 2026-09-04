import { addDays, subDays } from "date-fns";
import { prisma } from "@/lib/db";
import { notifyOnce } from "@/lib/notifications";
import { utcWeekStart } from "@/lib/timesheets/period";
import { loadApprovalInbox } from "@/lib/automation/inbox";
import {
  parseAutomationSettings,
  shouldSendPayrollReminder,
  type AutomationSettingsInput,
} from "@/lib/automation/playbooks";
import { employeeFullName } from "@/lib/utils";
import { EXPIRY_ALERT_DAYS } from "@/lib/people/expiry";

const HR_ROLES = ["SUPER_ADMIN", "HR_ADMIN"] as const;

async function settingsFor(companyId: string): Promise<AutomationSettingsInput> {
  const row = await prisma.automationSettings.findUnique({
    where: { companyId },
  });
  return parseAutomationSettings(row);
}

async function logJob(
  companyId: string,
  job: string,
  createdCount: number,
  detail: string
) {
  await prisma.automationJobLog.create({
    data: { companyId, job, createdCount, detail },
  });
}

export async function runDailyJobs(companyId: string, now = new Date()) {
  const settings = await settingsFor(companyId);
  let created = 0;
  const notes: string[] = [];

  if (settings.alerts.expiry) {
    const lead = settings.expiryLeadDays || EXPIRY_ALERT_DAYS;
    const from = subDays(now, 14);
    const until = addDays(now, lead);

    const [docs, certs, contracts] = await Promise.all([
      prisma.employeeDocument.findMany({
        where: {
          expiresAt: { gte: from, lte: until },
          employee: {
            companyId,
            status: { notIn: ["FIRED", "RESIGNED"] },
          },
        },
        include: {
          employee: { select: { firstName: true, lastName: true, employeeCode: true } },
        },
        take: 40,
      }),
      prisma.employeeCertification.findMany({
        where: {
          expiresAt: { gte: from, lte: until },
          employee: {
            companyId,
            status: { notIn: ["FIRED", "RESIGNED"] },
          },
        },
        include: {
          employee: { select: { firstName: true, lastName: true, employeeCode: true } },
        },
        take: 40,
      }),
      prisma.employee.findMany({
        where: {
          companyId,
          employmentType: "CONTRACT",
          endDate: { gte: from, lte: until },
          status: { notIn: ["FIRED", "RESIGNED"] },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
          endDate: true,
        },
        take: 40,
      }),
    ]);

    for (const doc of docs) {
      created += await notifyOnce({
        companyId,
        roles: [...HR_ROLES],
        type: "DOC_EXPIRY",
        title: `Document expiring — ${doc.name}`,
        body: `${employeeFullName(doc.employee.firstName, doc.employee.lastName)} (${doc.employee.employeeCode})`,
        linkUrl: `/employees/${doc.employeeId}`,
        entityType: "EmployeeDocument",
        entityId: doc.id,
      });
    }
    for (const cert of certs) {
      created += await notifyOnce({
        companyId,
        roles: [...HR_ROLES],
        type: "CERT_EXPIRY",
        title: `Certification expiring — ${cert.name}`,
        body: `${employeeFullName(cert.employee.firstName, cert.employee.lastName)} (${cert.employee.employeeCode})`,
        linkUrl: `/employees/${cert.employeeId}`,
        entityType: "EmployeeCertification",
        entityId: cert.id,
      });
    }
    for (const emp of contracts) {
      created += await notifyOnce({
        companyId,
        roles: [...HR_ROLES],
        type: "CONTRACT_EXPIRY",
        title: "Contract ending soon",
        body: `${employeeFullName(emp.firstName, emp.lastName)} (${emp.employeeCode})`,
        linkUrl: `/employees/${emp.id}`,
        entityType: "Employee",
        entityId: emp.id,
      });
    }
    notes.push(
      `expiry docs=${docs.length} certs=${certs.length} contracts=${contracts.length}`
    );
  }

  if (settings.alerts.expiry) {
    const yesterday = subDays(now, 1);
    const start = new Date(
      Date.UTC(
        yesterday.getUTCFullYear(),
        yesterday.getUTCMonth(),
        yesterday.getUTCDate()
      )
    );
    const end = addDays(start, 1);
    const absent = await prisma.attendanceDay.count({
      where: {
        companyId,
        workDate: { gte: start, lt: end },
        status: "ABSENT",
      },
    });
    if (absent >= 3) {
      created += await notifyOnce({
        companyId,
        roles: [...HR_ROLES],
        type: "ATTENDANCE_DIGEST",
        title: `${absent} clock absences yesterday`,
        body: "Timesheets remain the source of hours for payroll. Open Time reports if you need the picture.",
        linkUrl: "/reports?tab=time",
        entityType: "AttendanceDay",
        entityId: `absent-${start.toISOString().slice(0, 10)}`,
        dedupeDays: 2,
      });
      notes.push(`absences=${absent}`);
    }
  }

  await logJob(companyId, "daily", created, notes.join("; "));
  return created;
}

export async function runWeeklyJobs(companyId: string, now = new Date()) {
  const settings = await settingsFor(companyId);
  let created = 0;
  const notes: string[] = [];

  if (settings.alerts.approvals) {
    const items = await loadApprovalInbox({
      companyId,
      role: "SUPER_ADMIN",
    });
    if (items.length > 0) {
      created += await notifyOnce({
        companyId,
        roles: [...HR_ROLES],
        type: "APPROVALS_DIGEST",
        title: `${items.length} item${items.length === 1 ? "" : "s"} waiting in Approvals`,
        body: items
          .slice(0, 5)
          .map((item) => item.title)
          .join(" · "),
        linkUrl: "/approvals",
        entityType: "Approvals",
        entityId: `week-${utcWeekStart(now).toISOString().slice(0, 10)}`,
      });
      notes.push(`inbox=${items.length}`);
    }
  }

  if (settings.alerts.timesheets) {
    const weekStart = utcWeekStart(subDays(now, 7));
    const staff = await prisma.employee.findMany({
      where: {
        companyId,
        employmentType: "FULL_TIME",
        status: { notIn: ["FIRED", "RESIGNED"] },
      },
      select: { id: true },
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
    const missing = staff.filter((s) => !submitted.has(s.id)).length;
    if (missing > 0) {
      created += await notifyOnce({
        companyId,
        roles: [...HR_ROLES],
        type: "TIMESHEET_MISSING",
        title: `${missing} staff missing last week's timesheet`,
        body: "Open Timesheets to chase or validate the week.",
        linkUrl: "/timesheets",
        entityType: "TimesheetWeek",
        entityId: `missing-${weekStart.toISOString().slice(0, 10)}`,
      });
      notes.push(`missingTimesheets=${missing}`);
    }
  }

  if (settings.alerts.reviews) {
    const year = now.getFullYear();
    const staff = await prisma.employee.findMany({
      where: {
        companyId,
        status: { notIn: ["FIRED", "RESIGNED"] },
      },
      select: { id: true },
    });
    const done = await prisma.performanceReview.findMany({
      where: {
        companyId,
        periodYear: year,
        periodLabel: "ANNUAL",
        status: "COMPLETED",
      },
      select: { employeeId: true },
    });
    const completed = new Set(done.map((r) => r.employeeId));
    const outstanding = staff.filter((s) => !completed.has(s.id)).length;
    if (outstanding > 0) {
      created += await notifyOnce({
        companyId,
        roles: [...HR_ROLES],
        type: "REVIEW_DUE",
        title: `${outstanding} annual reviews still open for ${year}`,
        body: `Due window is ${settings.reviewLeadDays} days. Open Performance to record them — reviews do not change pay.`,
        linkUrl: "/performance?tab=reviews",
        entityType: "PerformanceReview",
        entityId: `annual-${year}`,
        dedupeDays: 12,
      });
      notes.push(`reviews=${outstanding}`);
    }
  }

  await logJob(companyId, "weekly", created, notes.join("; "));
  return created;
}

export async function runMonthlyJobs(companyId: string, now = new Date()) {
  const settings = await settingsFor(companyId);
  let created = 0;
  const notes: string[] = [];
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  if (settings.alerts.payroll) {
    const run = await prisma.payrollRun.findFirst({
      where: {
        companyId,
        periodMonth: month,
        periodYear: year,
        status: {
          in: ["APPROVED", "FORWARDED_TO_FINANCE", "PROCESSING", "PAID"],
        },
      },
      select: { id: true },
    });
    if (
      shouldSendPayrollReminder({
        dayOfMonth: now.getDate(),
        reminderDay: settings.payrollReminderDay,
        hasApprovedRunThisMonth: Boolean(run),
      })
    ) {
      created += await notifyOnce({
        companyId,
        roles: [...HR_ROLES],
        type: "PAYROLL_REMINDER",
        title: `Payroll reminder — ${month}/${year}`,
        body: "No cleared run for this month yet. Open Payroll to start the wizard.",
        linkUrl: "/payroll",
        entityType: "PayrollRun",
        entityId: `reminder-${year}-${month}`,
        dedupeDays: 20,
      });
      notes.push("payrollReminder");
    }
  }

  if (settings.alerts.compliance) {
    const missingTin = await prisma.employee.count({
      where: {
        companyId,
        status: { notIn: ["FIRED", "RESIGNED"] },
        OR: [{ tin: null }, { tin: "" }],
      },
    });
    if (missingTin > 0) {
      created += await notifyOnce({
        companyId,
        roles: [...HR_ROLES],
        type: "COMPLIANCE_REMINDER",
        title: `${missingTin} staff missing TIN`,
        body: "Open Reports → People or the employee record to complete tax IDs.",
        linkUrl: "/reports?tab=people",
        entityType: "Employee",
        entityId: `tin-${year}-${month}`,
        dedupeDays: 20,
      });
      notes.push(`missingTin=${missingTin}`);
    }
  }

  if (settings.alerts.compliance) {
    created += await notifyOnce({
      companyId,
      roles: [...HR_ROLES],
      type: "WORKFORCE_REPORT",
      title: "Monthly workforce report is ready",
      body: "Headcount, turnover, timesheets, and cost trends are on Reports.",
      linkUrl: "/reports?tab=people",
      entityType: "Report",
      entityId: `workforce-${year}-${month}`,
      dedupeDays: 20,
    });
    notes.push("workforceReport");
  }

  await logJob(companyId, "monthly", created, notes.join("; "));
  return created;
}

export async function runJobsForAllCompanies(
  job: "daily" | "weekly" | "monthly"
) {
  const companies = await prisma.company.findMany({
    select: { id: true },
  });
  let total = 0;
  for (const company of companies) {
    if (job === "daily") total += await runDailyJobs(company.id);
    else if (job === "weekly") total += await runWeeklyJobs(company.id);
    else total += await runMonthlyJobs(company.id);
  }
  return { companies: companies.length, created: total };
}
