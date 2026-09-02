import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requirePermission } from "@/lib/api-auth";
import { compileAttendanceStatus } from "@/lib/attendance/parse-clock-csv";
import { serializeBigInts } from "@/lib/payroll/config-mapper";

const ATTENDANCE_STATUSES = [
  "PRESENT",
  "LATE",
  "PARTIAL",
  "ABSENT",
  "ON_LEAVE",
  "OFF",
] as const;

const patchSchema = z.object({
  status: z.enum(ATTENDANCE_STATUSES).optional(),
  notes: z.string().trim().max(400).optional().nullable(),
  clockInAt: z.string().datetime().optional().nullable(),
  clockOutAt: z.string().datetime().optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("manageAttendance");
    const body = patchSchema.parse(await req.json());
    const existing = await prisma.attendanceDay.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
      include: { shift: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Attendance day not found" }, { status: 404 });
    }

    const clockInAt =
      body.clockInAt === undefined
        ? existing.clockInAt
        : body.clockInAt
          ? new Date(body.clockInAt)
          : null;
    const clockOutAt =
      body.clockOutAt === undefined
        ? existing.clockOutAt
        : body.clockOutAt
          ? new Date(body.clockOutAt)
          : null;

    let status = body.status ?? existing.status;
    let workedMinutes = existing.workedMinutes;
    let lateMinutes = existing.lateMinutes;
    if (body.clockInAt !== undefined || body.clockOutAt !== undefined) {
      const shiftStart = existing.shift
        ? new Date(existing.workDate)
        : existing.clockInAt ?? existing.workDate;
      if (existing.shift) {
        const [h, m] = existing.shift.startTime.split(":").map(Number);
        shiftStart.setHours(h || 0, m || 0, 0, 0);
      }
      const compiled = compileAttendanceStatus({
        expected: status !== "OFF",
        onLeave: status === "ON_LEAVE",
        clockInAt,
        clockOutAt:
          clockOutAt && clockInAt && clockOutAt > clockInAt ? clockOutAt : null,
        shiftStart,
        graceMinutes: existing.shift?.graceMinutes ?? 15,
        minPresentMinutes: 240,
        expectedMinutes: existing.expectedMinutes,
      });
      status = body.status ?? compiled.status;
      workedMinutes = compiled.workedMinutes;
      lateMinutes = compiled.lateMinutes;
    }

    const updated = await prisma.attendanceDay.update({
      where: { id: existing.id },
      data: {
        status,
        notes: body.notes === undefined ? existing.notes : body.notes,
        clockInAt,
        clockOutAt,
        workedMinutes,
        lateMinutes,
        compiledAt: new Date(),
      },
    });
    return NextResponse.json(serializeBigInts(updated));
  } catch (error) {
    return handleApiError(error);
  }
}
