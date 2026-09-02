import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requireAuth, requirePermission } from "@/lib/api-auth";
import { ensureTimeSchema } from "@/lib/ensure-time-schema";
import { parseLocalDay } from "@/lib/time/dates";
import { HOLIDAY_KINDS } from "@/lib/time/labels";

const createSchema = z.object({
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().trim().min(1).max(120),
  kind: z.enum(HOLIDAY_KINDS).default("PUBLIC"),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    await ensureTimeSchema();
    const year = Number(
      new URL(req.url).searchParams.get("year") ?? new Date().getFullYear()
    );
    const from = new Date(year, 0, 1, 0, 0, 0, 0);
    const to = new Date(year, 11, 31, 23, 59, 59, 999);
    const holidays = await prisma.companyHoliday.findMany({
      where: {
        companyId: session.user.companyId,
        workDate: { gte: from, lte: to },
      },
      orderBy: { workDate: "asc" },
    });
    return NextResponse.json(holidays);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("manageAttendance");
    await ensureTimeSchema();
    const body = createSchema.parse(await req.json());
    const workDate = parseLocalDay(body.workDate);
    const holiday = await prisma.companyHoliday.upsert({
      where: {
        companyId_workDate: {
          companyId: session.user.companyId,
          workDate,
        },
      },
      create: {
        companyId: session.user.companyId,
        workDate,
        name: body.name,
        kind: body.kind,
      },
      update: { name: body.name, kind: body.kind },
    });
    return NextResponse.json(holiday, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
