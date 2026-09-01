import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, handleApiError } from "@/lib/api-auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { utcDay } from "@/lib/timesheets/period";

const createSchema = z.object({
  employeeId: z.string().optional(),
  projectId: z.string(),
  workDate: z.string(),
  minutes: z.number().int().min(15).max(24 * 60),
  notes: z.string().trim().max(500).optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const reviewer = can(session.user.role, "reviewTimesheets");
    const staff = can(session.user.role, "accessStaffPortal");
    if (!reviewer && !staff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const employeeId = url.searchParams.get("employeeId");

    const entries = await prisma.timesheetEntry.findMany({
      where: {
        companyId: session.user.companyId,
        ...(staff && !reviewer && session.user.employeeId
          ? { employeeId: session.user.employeeId }
          : {}),
        ...(reviewer && employeeId ? { employeeId } : {}),
        ...(status ? { status: status as "SUBMITTED" } : {}),
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
    const reviewer = can(session.user.role, "reviewTimesheets");
    const staff = can(session.user.role, "accessStaffPortal");
    if (!reviewer && !staff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = createSchema.parse(await req.json());
    let employeeId = session.user.employeeId ?? null;
    if (reviewer && body.employeeId) {
      employeeId = body.employeeId;
    }
    if (!employeeId) {
      return NextResponse.json(
        { error: "Choose a staff record for this timesheet" },
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
    if (!reviewer && employee.employmentType === "CONTRACT") {
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

    const workDate = utcDay(body.workDate);
    const entry = await prisma.timesheetEntry.upsert({
      where: {
        employeeId_projectId_workDate: {
          employeeId: employee.id,
          projectId: project.id,
          workDate,
        },
      },
      create: {
        companyId: session.user.companyId,
        employeeId: employee.id,
        projectId: project.id,
        workDate,
        minutes: body.minutes,
        notes: body.notes ?? null,
        status: reviewer ? "APPROVED" : "SUBMITTED",
      },
      update: {
        minutes: body.minutes,
        notes: body.notes ?? null,
        status: reviewer ? "APPROVED" : "SUBMITTED",
      },
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
