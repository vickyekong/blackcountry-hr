import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requirePermission } from "@/lib/api-auth";
import { ensureTimeSchema } from "@/lib/ensure-time-schema";
import { parseLocalDay } from "@/lib/time/dates";
import { quoteOvertimeKobo } from "@/lib/time/overtime";
import { notifyUsersInRoles } from "@/lib/notifications";
import { displayName } from "@/lib/employees/data-quality";
import { serializeBigInts } from "@/lib/payroll/config-mapper";

const createSchema = z.object({
  employeeId: z.string().min(1),
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  minutes: z.number().int().min(15).max(16 * 60),
  reason: z.string().trim().max(500).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requirePermission("manageAttendance");
    await ensureTimeSchema();
    const status = new URL(req.url).searchParams.get("status");
    const rows = await prisma.overtimeRequest.findMany({
      where: {
        companyId: session.user.companyId,
        ...(status ? { status } : {}),
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
          },
        },
        approvedBy: { select: { name: true } },
      },
      orderBy: [{ workDate: "desc" }, { createdAt: "desc" }],
      take: 200,
    });
    return NextResponse.json(serializeBigInts(rows));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("manageAttendance");
    await ensureTimeSchema();
    const body = createSchema.parse(await req.json());
    const employee = await prisma.employee.findFirst({
      where: { id: body.employeeId, companyId: session.user.companyId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeCode: true,
      },
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    const workDate = parseLocalDay(body.workDate);
    const amountKobo = await quoteOvertimeKobo({
      companyId: session.user.companyId,
      employeeId: employee.id,
      workDate,
      minutes: body.minutes,
    });
    const request = await prisma.overtimeRequest.create({
      data: {
        companyId: session.user.companyId,
        employeeId: employee.id,
        workDate,
        minutes: body.minutes,
        reason: body.reason,
        status: "PENDING",
        amountKobo,
      },
    });
    await notifyUsersInRoles({
      companyId: session.user.companyId,
      roles: ["HR_ADMIN", "SUPER_ADMIN"],
      type: "OVERTIME_REQUEST",
      title: "Overtime recorded",
      body: `${displayName(employee.firstName, employee.lastName, employee.employeeCode)} — ${body.minutes} minutes on ${body.workDate}.`,
      linkUrl: "/timesheets?tab=overtime",
      entityType: "OvertimeRequest",
      entityId: request.id,
      excludeUserId: session.user.id,
    });
    return NextResponse.json(serializeBigInts(request), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
