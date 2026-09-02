import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requirePermission } from "@/lib/api-auth";
import { parseLocalDay } from "@/lib/time/dates";

const createSchema = z.object({
  employeeId: z.string().min(1),
  punchedAt: z.string().datetime().optional(),
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  punchType: z.enum(["IN", "OUT"]),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("manageAttendance");
    const body = createSchema.parse(await req.json());
    const employee = await prisma.employee.findFirst({
      where: { id: body.employeeId, companyId: session.user.companyId },
      select: { id: true, clockDeviceId: true, employeeCode: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    let punchedAt: Date;
    if (body.punchedAt) {
      punchedAt = new Date(body.punchedAt);
    } else if (body.workDate && body.time) {
      const day = parseLocalDay(body.workDate);
      const [hours, minutes] = body.time.split(":").map(Number);
      punchedAt = new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        hours,
        minutes,
        0,
        0
      );
    } else {
      punchedAt = new Date();
    }

    const punch = await prisma.attendancePunch.create({
      data: {
        companyId: session.user.companyId,
        deviceUserId: employee.clockDeviceId || employee.employeeCode,
        employeeId: employee.id,
        punchedAt,
        punchType: body.punchType,
        source: "MANUAL",
      },
    });
    return NextResponse.json(punch, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
