import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requirePermission } from "@/lib/api-auth";
import { ensureTimeSchema } from "@/lib/ensure-time-schema";
import { parseLocalDay } from "@/lib/time/dates";
import { SHIFT_EXCEPTION_KINDS } from "@/lib/time/labels";

const createSchema = z
  .object({
    employeeId: z.string().min(1),
    workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    kind: z.enum(SHIFT_EXCEPTION_KINDS),
    shiftId: z.string().optional().nullable(),
    notes: z.string().trim().max(300).optional(),
  })
  .superRefine((body, ctx) => {
    if (body.kind === "SHIFT" && !body.shiftId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pick a shift to cover",
        path: ["shiftId"],
      });
    }
  });

export async function GET(req: NextRequest) {
  try {
    const session = await requirePermission("manageAttendance");
    await ensureTimeSchema();
    const month = Number(
      new URL(req.url).searchParams.get("month") ?? new Date().getMonth() + 1
    );
    const year = Number(
      new URL(req.url).searchParams.get("year") ?? new Date().getFullYear()
    );
    const from = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const to = new Date(year, month, 0, 23, 59, 59, 999);
    const rows = await prisma.shiftException.findMany({
      where: {
        companyId: session.user.companyId,
        workDate: { gte: from, lte: to },
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
        shift: { select: { id: true, name: true } },
      },
      orderBy: { workDate: "asc" },
    });
    return NextResponse.json(rows);
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
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    let shiftId: string | null = null;
    if (body.kind === "SHIFT" && body.shiftId) {
      const shift = await prisma.shiftTemplate.findFirst({
        where: { id: body.shiftId, companyId: session.user.companyId },
      });
      if (!shift) {
        return NextResponse.json({ error: "Shift not found" }, { status: 404 });
      }
      shiftId = shift.id;
    }
    const workDate = parseLocalDay(body.workDate);
    const row = await prisma.shiftException.upsert({
      where: {
        employeeId_workDate: {
          employeeId: body.employeeId,
          workDate,
        },
      },
      create: {
        companyId: session.user.companyId,
        employeeId: body.employeeId,
        workDate,
        kind: body.kind,
        shiftId,
        notes: body.notes,
      },
      update: {
        kind: body.kind,
        shiftId,
        notes: body.notes,
      },
    });
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
