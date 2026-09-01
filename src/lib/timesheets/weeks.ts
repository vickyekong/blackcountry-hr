import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/api-auth";
import { notifyEmployeeUser, notifyUsersInRoles } from "@/lib/notifications";
import { getAppBaseUrl } from "@/lib/app-url";
import {
  formatWeekRange,
  isoDateUtc,
  utcWeekEndExclusive,
  utcWeekStart,
} from "@/lib/timesheets/period";

export function isTimesheetWeekLocked(status: string | null | undefined) {
  return status === "VALIDATED";
}

export async function findTimesheetWeek(
  companyId: string,
  employeeId: string,
  workDate: Date | string
) {
  const weekStart = utcWeekStart(workDate);
  return prisma.timesheetWeek.findUnique({
    where: {
      employeeId_weekStart: { employeeId, weekStart },
    },
  }).then((row) => {
    if (row && row.companyId !== companyId) return null;
    return row;
  });
}

export async function assertTimesheetWeekEditable(
  companyId: string,
  employeeId: string,
  workDate: Date | string
) {
  const week = await findTimesheetWeek(companyId, employeeId, workDate);
  if (isTimesheetWeekLocked(week?.status)) {
    throw new AuthError(
      "HR has validated this week. Hours can no longer be changed.",
      400
    );
  }
  return week;
}

export async function upsertOpenTimesheetWeek(options: {
  companyId: string;
  employeeId: string;
  workDate: Date | string;
}) {
  const weekStart = utcWeekStart(options.workDate);
  const existing = await prisma.timesheetWeek.findUnique({
    where: {
      employeeId_weekStart: {
        employeeId: options.employeeId,
        weekStart,
      },
    },
  });
  if (existing && existing.companyId !== options.companyId) {
    throw new AuthError("Week not found", 404);
  }
  if (isTimesheetWeekLocked(existing?.status)) {
    throw new AuthError(
      "HR has validated this week. Hours can no longer be changed.",
      400
    );
  }
  return prisma.timesheetWeek.upsert({
    where: {
      employeeId_weekStart: {
        employeeId: options.employeeId,
        weekStart,
      },
    },
    create: {
      companyId: options.companyId,
      employeeId: options.employeeId,
      weekStart,
      status: "SUBMITTED",
    },
    update: {
      status: "SUBMITTED",
      returnReason: null,
    },
  });
}

export async function validateTimesheetWeek(options: {
  companyId: string;
  employeeId: string;
  weekStart: Date | string;
  validatedById: string;
  action: "validate" | "return";
  reason?: string;
}) {
  const weekStart = utcWeekStart(options.weekStart);
  const weekEnd = utcWeekEndExclusive(weekStart);
  const entries = await prisma.timesheetEntry.findMany({
    where: {
      companyId: options.companyId,
      employeeId: options.employeeId,
      workDate: { gte: weekStart, lt: weekEnd },
    },
  });
  if (entries.length === 0) {
    throw new AuthError("No hours logged for this week", 400);
  }

  const existing = await prisma.timesheetWeek.findUnique({
    where: {
      employeeId_weekStart: {
        employeeId: options.employeeId,
        weekStart,
      },
    },
  });
  if (existing && isTimesheetWeekLocked(existing.status) && options.action === "validate") {
    throw new AuthError("This week is already validated", 400);
  }
  if (existing && isTimesheetWeekLocked(existing.status) && options.action === "return") {
    throw new AuthError(
      "Validated weeks cannot be sent back. Hours are locked.",
      400
    );
  }

  if (options.action === "validate") {
    await prisma.$transaction([
      prisma.timesheetWeek.upsert({
        where: {
          employeeId_weekStart: { employeeId: options.employeeId, weekStart },
        },
        create: {
          companyId: options.companyId,
          employeeId: options.employeeId,
          weekStart,
          status: "VALIDATED",
          validatedById: options.validatedById,
          validatedAt: new Date(),
          returnReason: null,
        },
        update: {
          status: "VALIDATED",
          validatedById: options.validatedById,
          validatedAt: new Date(),
          returnReason: null,
        },
      }),
      prisma.timesheetEntry.updateMany({
        where: {
          companyId: options.companyId,
          employeeId: options.employeeId,
          workDate: { gte: weekStart, lt: weekEnd },
          status: { in: ["DRAFT", "SUBMITTED", "REJECTED"] },
        },
        data: { status: "APPROVED" },
      }),
    ]);
  } else {
    const reason = options.reason?.trim();
    await prisma.$transaction([
      prisma.timesheetWeek.upsert({
        where: {
          employeeId_weekStart: { employeeId: options.employeeId, weekStart },
        },
        create: {
          companyId: options.companyId,
          employeeId: options.employeeId,
          weekStart,
          status: "RETURNED",
          returnReason: reason || null,
        },
        update: {
          status: "RETURNED",
          validatedById: null,
          validatedAt: null,
          returnReason: reason || null,
        },
      }),
      prisma.timesheetEntry.updateMany({
        where: {
          companyId: options.companyId,
          employeeId: options.employeeId,
          workDate: { gte: weekStart, lt: weekEnd },
          status: { in: ["DRAFT", "SUBMITTED"] },
        },
        data: { status: "REJECTED" },
      }),
    ]);
  }

  const week = await prisma.timesheetWeek.findUnique({
    where: {
      employeeId_weekStart: { employeeId: options.employeeId, weekStart },
    },
  });
  const label = formatWeekRange(weekStart);
  const employee = await prisma.employee.findFirst({
    where: { id: options.employeeId, companyId: options.companyId },
    select: { firstName: true, lastName: true },
  });
  const name = employee
    ? `${employee.firstName} ${employee.lastName}`
    : "Staff";

  const owner = await prisma.user.findFirst({
    where: { companyId: options.companyId, employeeId: options.employeeId },
    select: { role: true },
  });
  const ownerPath =
    owner?.role === "BUSINESS_HEAD" ? "/timesheets" : "/staff/timesheets";
  const ownerLink = `${getAppBaseUrl()}${ownerPath}`;

  if (options.action === "validate") {
    await notifyEmployeeUser({
      companyId: options.companyId,
      employeeId: options.employeeId,
      type: "TIMESHEET",
      title: `Timesheet validated — ${label}`,
      body: "HR validated this week. You can no longer change those hours.",
      linkUrl: ownerLink,
      entityType: "TimesheetWeek",
      entityId: week?.id,
    });
  } else {
    await notifyEmployeeUser({
      companyId: options.companyId,
      employeeId: options.employeeId,
      type: "TIMESHEET",
      title: `Timesheet sent back — ${label}`,
      body: options.reason?.trim()
        ? `HR sent this week back: ${options.reason.trim()}`
        : "HR sent this week back. Update the hours and save again.",
      linkUrl: ownerLink,
      entityType: "TimesheetWeek",
      entityId: week?.id,
    });
  }

  if (options.action !== "validate") {
    await notifyUsersInRoles({
      companyId: options.companyId,
      roles: ["HR_ADMIN", "SUPER_ADMIN"],
      type: "TIMESHEET",
      title: `Timesheet returned — ${name}`,
      body: `${name}'s week (${label}) was sent back.`,
      linkUrl: `${getAppBaseUrl()}/timesheets`,
      entityType: "TimesheetWeek",
      entityId: week?.id,
      excludeUserId: options.validatedById,
    });
  }

  return week;
}

export function serializeTimesheetWeek(
  week: {
    weekStart: Date;
    status: string;
    returnReason?: string | null;
  } | null
) {
  if (!week) {
    return {
      weekStart: null as string | null,
      status: "OPEN" as const,
      locked: false,
      returnReason: null as string | null,
      label: "",
    };
  }
  return {
    weekStart: isoDateUtc(week.weekStart),
    status: week.status,
    locked: isTimesheetWeekLocked(week.status),
    returnReason: week.returnReason ?? null,
    label: formatWeekRange(week.weekStart),
  };
}
