import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api-auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { assertTimesheetWeekEditable } from "@/lib/timesheets/weeks";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const validator = can(session.user.role, "validateTimesheets");
    const entry = await prisma.timesheetEntry.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    });
    if (!entry) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const own = session.user.employeeId === entry.employeeId;
    if (!validator && !own) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await assertTimesheetWeekEditable(
      session.user.companyId,
      entry.employeeId,
      entry.workDate
    );
    await prisma.timesheetEntry.delete({ where: { id: entry.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
