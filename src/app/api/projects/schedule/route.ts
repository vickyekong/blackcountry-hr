import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  AuthError,
  handleApiError,
  requireAuth,
} from "@/lib/api-auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import {
  hoursToMinutes,
  minutesToHours,
  splitWeeklyMinutesAcrossWeekdays,
} from "@/lib/projects/workload";
import {
  formatWeekRange,
  isoDateUtc,
  utcDay,
  utcWeekDays,
  utcWeekEndExclusive,
  utcWeekStart,
} from "@/lib/timesheets/period";

const staffSelect = {
  id: true,
  firstName: true,
  lastName: true,
  employeeCode: true,
} as const;

const upsertSchema = z.object({
  action: z.literal("upsert").default("upsert"),
  employeeId: z.string().min(1),
  projectId: z.string().min(1),
  workDate: z.string().min(1),
  plannedHours: z.number().min(0).max(24),
});

const fillSchema = z.object({
  action: z.literal("fill-week"),
  weekStart: z.string().min(1),
});

const bodySchema = z.union([fillSchema, upsertSchema]);

function weekdayLabel(date: Date) {
  return new Intl.DateTimeFormat("en-NG", {
    weekday: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (!can(session.user.role, "viewProjects")) {
      throw new AuthError("Forbidden", 403);
    }
    const weekStart = utcWeekStart(
      req.nextUrl.searchParams.get("weekStart") || new Date()
    );
    const weekEnd = utcWeekEndExclusive(weekStart);
    const companyId = session.user.companyId;
    const manage = can(session.user.role, "manageProjects");
    const selfOnly = !manage ? session.user.employeeId : null;

    const [members, slots, logged, projects] = await Promise.all([
      prisma.projectMember.findMany({
        where: {
          project: { companyId, status: { not: "ARCHIVED" } },
          ...(selfOnly ? { employeeId: selfOnly } : {}),
        },
        include: {
          employee: { select: staffSelect },
          project: { select: { id: true, name: true } },
        },
      }),
      prisma.workScheduleEntry.findMany({
        where: {
          companyId,
          workDate: { gte: weekStart, lt: weekEnd },
          ...(selfOnly ? { employeeId: selfOnly } : {}),
        },
        include: { project: { select: { id: true, name: true } } },
      }),
      prisma.timesheetEntry.findMany({
        where: {
          companyId,
          workDate: { gte: weekStart, lt: weekEnd },
          status: { not: "REJECTED" },
          ...(selfOnly ? { employeeId: selfOnly } : {}),
        },
        select: { employeeId: true, workDate: true, minutes: true },
      }),
      prisma.project.findMany({
        where: { companyId, status: { not: "ARCHIVED" } },
        select: { id: true, name: true, status: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const employeeMap = new Map<string, (typeof members)[number]["employee"]>();
    for (const member of members) {
      employeeMap.set(member.employeeId, member.employee);
    }
    const missingIds = Array.from(
      new Set(
        slots
          .map((slot) => slot.employeeId)
          .filter((id) => !employeeMap.has(id))
      )
    );
    if (missingIds.length) {
      const extra = await prisma.employee.findMany({
        where: { companyId, id: { in: missingIds } },
        select: staffSelect,
      });
      for (const employee of extra) employeeMap.set(employee.id, employee);
    }
    if (selfOnly) {
      const me = await prisma.employee.findFirst({
        where: { id: selfOnly, companyId },
        select: staffSelect,
      });
      if (me) employeeMap.set(me.id, me);
    }

    const loggedByKey = new Map<string, number>();
    for (const row of logged) {
      const key = `${row.employeeId}:${isoDateUtc(row.workDate)}`;
      loggedByKey.set(key, (loggedByKey.get(key) ?? 0) + row.minutes);
    }

    const days = utcWeekDays(weekStart).map((date) => ({
      date: isoDateUtc(date),
      label: weekdayLabel(date),
      weekday: date.getUTCDay(),
    }));

    return NextResponse.json({
      weekStart: isoDateUtc(weekStart),
      weekLabel: formatWeekRange(weekStart),
      canEdit: manage,
      days,
      projects,
      employees: Array.from(employeeMap.values()).sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(
          `${b.firstName} ${b.lastName}`
        )
      ),
      allocations: members.map((m) => ({
        employeeId: m.employeeId,
        projectId: m.projectId,
        projectName: m.project.name,
        plannedMinutesPerWeek: m.plannedMinutesPerWeek,
      })),
      slots: slots.map((slot) => ({
        id: slot.id,
        employeeId: slot.employeeId,
        projectId: slot.projectId,
        projectName: slot.project.name,
        workDate: isoDateUtc(slot.workDate),
        plannedMinutes: slot.plannedMinutes,
        plannedHours: minutesToHours(slot.plannedMinutes),
      })),
      logged: Array.from(loggedByKey.entries()).map(([key, minutes]) => {
        const [employeeId, workDate] = key.split(":");
        return {
          employeeId,
          workDate,
          minutes,
          hours: minutesToHours(minutes),
        };
      }),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (!can(session.user.role, "manageProjects")) {
      throw new AuthError("Forbidden", 403);
    }
    const body = bodySchema.parse(await req.json());
    const companyId = session.user.companyId;

    if (body.action === "fill-week") {
      const weekStart = utcWeekStart(body.weekStart);
      const days = utcWeekDays(weekStart);
      const members = await prisma.projectMember.findMany({
        where: {
          plannedMinutesPerWeek: { gt: 0 },
          project: { companyId, status: { not: "ARCHIVED" } },
          employee: { companyId, status: "ACTIVE" },
        },
      });
      for (const member of members) {
        const parts = splitWeeklyMinutesAcrossWeekdays(
          member.plannedMinutesPerWeek
        );
        for (let i = 0; i < parts.length; i += 1) {
          const minutes = parts[i];
          const workDate = days[i];
          if (!workDate) continue;
          if (minutes <= 0) {
            await prisma.workScheduleEntry.deleteMany({
              where: {
                employeeId: member.employeeId,
                projectId: member.projectId,
                workDate,
              },
            });
            continue;
          }
          await prisma.workScheduleEntry.upsert({
            where: {
              employeeId_projectId_workDate: {
                employeeId: member.employeeId,
                projectId: member.projectId,
                workDate,
              },
            },
            create: {
              companyId,
              employeeId: member.employeeId,
              projectId: member.projectId,
              workDate,
              plannedMinutes: minutes,
            },
            update: { plannedMinutes: minutes },
          });
        }
      }
      return NextResponse.json({ filled: members.length });
    }

    const workDate = utcDay(body.workDate);
    const employee = await prisma.employee.findFirst({
      where: { id: body.employeeId, companyId },
      select: { id: true },
    });
    const project = await prisma.project.findFirst({
      where: { id: body.projectId, companyId, status: { not: "ARCHIVED" } },
      select: { id: true },
    });
    if (!employee || !project) {
      return NextResponse.json(
        { error: "Employee or project not found" },
        { status: 400 }
      );
    }
    const plannedMinutes = hoursToMinutes(body.plannedHours);
    if (plannedMinutes <= 0) {
      await prisma.workScheduleEntry.deleteMany({
        where: {
          employeeId: employee.id,
          projectId: project.id,
          workDate,
        },
      });
      return NextResponse.json({ removed: true });
    }
    const slot = await prisma.workScheduleEntry.upsert({
      where: {
        employeeId_projectId_workDate: {
          employeeId: employee.id,
          projectId: project.id,
          workDate,
        },
      },
      create: {
        companyId,
        employeeId: employee.id,
        projectId: project.id,
        workDate,
        plannedMinutes,
      },
      update: { plannedMinutes },
    });
    return NextResponse.json({
      ...slot,
      workDate: isoDateUtc(slot.workDate),
      plannedHours: minutesToHours(slot.plannedMinutes),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
