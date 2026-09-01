import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requireStaffEmployee } from "@/lib/api-auth";

const cancelSchema = z.object({
  action: z.literal("cancel"),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireStaffEmployee();
    cancelSchema.parse(await req.json());

    const leave = await prisma.leaveRequest.findFirst({
      where: {
        id: params.id,
        employeeId: session.employeeId,
      },
    });
    if (!leave) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (leave.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending leave can be withdrawn" },
        { status: 400 }
      );
    }

    const updated = await prisma.leaveRequest.update({
      where: { id: leave.id },
      data: { status: "CANCELLED" },
    });

    await prisma.auditLog.create({
      data: {
        companyId: session.user.companyId,
        action: "CANCELLED",
        entityType: "LeaveRequest",
        entityId: leave.id,
        performedById: session.user.id,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
