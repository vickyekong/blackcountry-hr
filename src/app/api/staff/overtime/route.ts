import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requireStaffEmployee } from "@/lib/api-auth";
import { ensureTimeSchema } from "@/lib/ensure-time-schema";
import { parseLocalDay } from "@/lib/time/dates";
import { quoteOvertimeKobo } from "@/lib/time/overtime";
import { notifyUsersInRoles } from "@/lib/notifications";
import { displayName } from "@/lib/employees/data-quality";
import { serializeBigInts } from "@/lib/payroll/config-mapper";

const createSchema = z.object({
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  minutes: z.number().int().min(15).max(16 * 60),
  reason: z.string().trim().max(500).optional(),
});

export async function GET() {
  try {
    const session = await requireStaffEmployee();
    await ensureTimeSchema();
    const rows = await prisma.overtimeRequest.findMany({
      where: { employeeId: session.employeeId },
      orderBy: { workDate: "desc" },
      take: 50,
    });
    return NextResponse.json(serializeBigInts(rows));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireStaffEmployee();
    await ensureTimeSchema();
    const body = createSchema.parse(await req.json());
    const employee = await prisma.employee.findFirst({
      where: { id: session.employeeId, companyId: session.user.companyId },
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
      title: "Overtime request from staff",
      body: `${displayName(employee.firstName, employee.lastName, employee.employeeCode)} requested ${body.minutes} minutes on ${body.workDate}.`,
      linkUrl: "/timesheets?tab=overtime",
      entityType: "OvertimeRequest",
      entityId: request.id,
    });
    return NextResponse.json(serializeBigInts(request), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
