import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requirePermission, handleApiError } from "@/lib/api-auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";

const patchSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().trim().max(400).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("reviewTimesheets");
    const body = patchSchema.parse(await req.json());
    const entry = await prisma.timesheetEntry.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    });
    if (!entry) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (entry.status !== "SUBMITTED" && entry.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only submitted hours can be approved or sent back" },
        { status: 400 }
      );
    }
    const updated = await prisma.timesheetEntry.update({
      where: { id: entry.id },
      data: {
        status: body.action === "approve" ? "APPROVED" : "REJECTED",
        notes:
          body.action === "reject" && body.reason
            ? `${entry.notes ? `${entry.notes}\n` : ""}Sent back: ${body.reason}`
            : entry.notes,
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const reviewer = can(session.user.role, "reviewTimesheets");
    const entry = await prisma.timesheetEntry.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    });
    if (!entry) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const own =
      session.user.role === "EMPLOYEE" &&
      session.user.employeeId === entry.employeeId;
    if (!reviewer && !own) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!reviewer && entry.status === "APPROVED") {
      return NextResponse.json(
        { error: "Approved hours cannot be deleted" },
        { status: 400 }
      );
    }
    await prisma.timesheetEntry.delete({ where: { id: entry.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
