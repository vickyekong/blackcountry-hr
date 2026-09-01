import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, handleApiError } from "@/lib/api-auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { utcDay, utcWeekEndExclusive, utcWeekStart } from "@/lib/timesheets/period";
import { upsertOpenTimesheetWeek } from "@/lib/timesheets/weeks";

const createSchema = z.object({
  employeeId: z.string().optional(),
  projectId: z.string(),
  taskId: z.string(),
  workDate: z.string(),
  minutes: z.number().int().min(15).max(24 * 60),
  notes: z.string().trim().max(500).optional().nullable(),
});

function canViewTimesheets(role: Parameters<typeof can>[0]) {
  return (
    can(role, "validateTimesheets") ||
    can(role, "logTimesheets") ||
    can(role, "accessStaffPortal")
  );
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const validator = can(session.user.role, "validateTimesheets");
    const logger = can(session.user.role, "logTimesheets");
    if (!canViewTimesheets(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const employeeId = url.searchParams.get("employeeId");
    const weekStartParam = url.searchParams.get("weekStart");

    const ownOnly = !validator && (logger || can(session.user.role, "accessStaffPortal"));
    const scopedEmployeeId = ownOnly
      ? session.user.employeeId
      : employeeId || undefined;
    if (ownOnly && !scopedEmployeeId) {
      return NextResponse.json([]);
    }

    const weekFilter = weekStartParam
      ? {
          workDate: {
            gte: utcWeekStart(weekStartParam),
            lt: utcWeekEndExclusive(weekStartParam),
          },
        }
      : {};

    const entries = await prisma.timesheetEntry.findMany({
      where: {
        companyId: session.user.companyId,
        ...(scopedEmployeeId ? { employeeId: scopedEmployeeId } : {}),
        ...(status ? { status: status as "SUBMITTED" } : {}),
        ...weekFilter,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            employmentType: true,
          },
        },
        project: { select: { id: true, name: true, code: true } },
        task: { select: { id: true, name: true } },
      },
      orderBy: [{ workDate: "desc" }, { createdAt: "desc" }],
      take: 400,
    });
    return NextResponse.json(entries);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const validator = can(session.user.role, "validateTimesheets");
    const logger = can(session.user.role, "logTimesheets");
    if (!validator && !logger && !can(session.user.role, "accessStaffPortal")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = createSchema.parse(await req.json());
    let employeeId = session.user.employeeId ?? null;
    if (validator && body.employeeId) {
      employeeId = body.employeeId;
    }
    if (!validator && body.employeeId && body.employeeId !== session.user.employeeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!employeeId) {
      return NextResponse.json(
        { error: "Ask HR to link your staff record so you can log hours." },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId: session.user.companyId },
      select: { id: true, employmentType: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    if (!validator && employee.employmentType === "CONTRACT") {
      return NextResponse.json(
        { error: "Contract staff do not have a portal. Ask HR to log hours." },
        { status: 403 }
      );
    }

    const project = await prisma.project.findFirst({
      where: {
        id: body.projectId,
        companyId: session.user.companyId,
        status: "ACTIVE",
      },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const task = await prisma.projectTask.findFirst({
      where: {
        id: body.taskId,
        projectId: project.id,
        status: "ACTIVE",
      },
    });
    if (!task) {
      return NextResponse.json(
        { error: "Pick a task on that project." },
        { status: 400 }
      );
    }

    const workDate = utcDay(body.workDate);
    await upsertOpenTimesheetWeek({
      companyId: session.user.companyId,
      employeeId: employee.id,
      workDate,
    });

    const entry = await prisma.timesheetEntry.upsert({
      where: {
        employeeId_projectId_taskId_workDate: {
          employeeId: employee.id,
          projectId: project.id,
          taskId: task.id,
          workDate,
        },
      },
      create: {
        companyId: session.user.companyId,
        employeeId: employee.id,
        projectId: project.id,
        taskId: task.id,
        workDate,
        minutes: body.minutes,
        notes: body.notes ?? null,
        status: "SUBMITTED",
      },
      update: {
        minutes: body.minutes,
        notes: body.notes ?? null,
        status: "SUBMITTED",
      },
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
