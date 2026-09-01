import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireAuth,
  requirePermission,
  handleApiError,
} from "@/lib/api-auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import {
  formatWeekRange,
  isoDateUtc,
  utcWeekEndExclusive,
  utcWeekStart,
} from "@/lib/timesheets/period";
import {
  serializeTimesheetWeek,
  validateTimesheetWeek,
} from "@/lib/timesheets/weeks";

const patchSchema = z.object({
  employeeId: z.string(),
  weekStart: z.string(),
  action: z.enum(["validate", "return"]),
  reason: z.string().trim().max(400).optional(),
});

const employeeSelect = {
  id: true,
  firstName: true,
  lastName: true,
  employeeCode: true,
  employmentType: true,
} as const;

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const validator = can(session.user.role, "validateTimesheets");
    const logger = can(session.user.role, "logTimesheets");
    if (!validator && !logger) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const weekStartParam = url.searchParams.get("weekStart");
    const employeeIdParam = url.searchParams.get("employeeId");
    const pending = url.searchParams.get("pending") === "1";

    const ownEmployeeId = session.user.employeeId;
    const employeeId = validator
      ? employeeIdParam || undefined
      : ownEmployeeId || undefined;

    if (!validator && !employeeId) {
      return NextResponse.json({ weeks: [] });
    }

    if (weekStartParam && employeeId) {
      const weekStart = utcWeekStart(weekStartParam);
      const weekEnd = utcWeekEndExclusive(weekStart);
      const [week, entries] = await Promise.all([
        prisma.timesheetWeek.findUnique({
          where: { employeeId_weekStart: { employeeId, weekStart } },
        }),
        prisma.timesheetEntry.findMany({
          where: {
            companyId: session.user.companyId,
            employeeId,
            workDate: { gte: weekStart, lt: weekEnd },
          },
          include: {
            employee: { select: employeeSelect },
            project: { select: { id: true, name: true, code: true } },
            task: { select: { id: true, name: true } },
          },
          orderBy: [{ workDate: "asc" }, { createdAt: "asc" }],
        }),
      ]);
      if (week && week.companyId !== session.user.companyId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({
        week: {
          ...serializeTimesheetWeek(week),
          weekStart: isoDateUtc(weekStart),
          label: formatWeekRange(weekStart),
          locked: week?.status === "VALIDATED",
          status: week?.status ?? (entries.length ? "SUBMITTED" : "OPEN"),
        },
        entries,
      });
    }

    const entries = await prisma.timesheetEntry.findMany({
      where: {
        companyId: session.user.companyId,
        ...(employeeId ? { employeeId } : {}),
        ...(pending && validator
          ? { status: { in: ["SUBMITTED", "DRAFT"] } }
          : {}),
      },
          include: {
            employee: { select: employeeSelect },
            project: { select: { id: true, name: true, code: true } },
            task: { select: { id: true, name: true } },
          },
          orderBy: [{ workDate: "desc" }],
          take: 800,
    });

    const weekStarts = [
      ...new Set(entries.map((row) => isoDateUtc(utcWeekStart(row.workDate)))),
    ];
    const weeksDb = weekStarts.length
      ? await prisma.timesheetWeek.findMany({
          where: {
            companyId: session.user.companyId,
            ...(employeeId ? { employeeId } : {}),
            weekStart: {
              in: weekStarts.map((d) => utcWeekStart(d)),
            },
          },
        })
      : [];
    const weekKey = (employeeId: string, start: Date) =>
      `${employeeId}:${isoDateUtc(start)}`;
    const weekMap = new Map(
      weeksDb.map((row) => [weekKey(row.employeeId, row.weekStart), row])
    );

    const grouped = new Map<
      string,
      {
        employeeId: string;
        employee: (typeof entries)[number]["employee"];
        weekStart: string;
        entries: typeof entries;
      }
    >();
    for (const entry of entries) {
      const start = isoDateUtc(utcWeekStart(entry.workDate));
      const key = `${entry.employeeId}:${start}`;
      const current = grouped.get(key);
      if (current) {
        current.entries.push(entry);
      } else {
        grouped.set(key, {
          employeeId: entry.employeeId,
          employee: entry.employee,
          weekStart: start,
          entries: [entry],
        });
      }
    }

    const weeks = [...grouped.values()]
      .map((group) => {
        const db = weekMap.get(`${group.employeeId}:${group.weekStart}`);
        const locked = db?.status === "VALIDATED";
        return {
          employeeId: group.employeeId,
          employee: group.employee,
          weekStart: group.weekStart,
          label: formatWeekRange(group.weekStart),
          status: db?.status ?? "SUBMITTED",
          locked,
          returnReason: db?.returnReason ?? null,
          totalMinutes: group.entries.reduce((sum, row) => sum + row.minutes, 0),
          entries: group.entries,
        };
      })
      .filter((week) => (pending ? !week.locked && week.status !== "VALIDATED" : true))
      .sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));

    return NextResponse.json({ weeks });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requirePermission("validateTimesheets");
    const body = patchSchema.parse(await req.json());
    const employee = await prisma.employee.findFirst({
      where: { id: body.employeeId, companyId: session.user.companyId },
      select: { id: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    const week = await validateTimesheetWeek({
      companyId: session.user.companyId,
      employeeId: employee.id,
      weekStart: body.weekStart,
      validatedById: session.user.id,
      action: body.action,
      reason: body.reason,
    });
    return NextResponse.json({
      week: serializeTimesheetWeek(week),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
