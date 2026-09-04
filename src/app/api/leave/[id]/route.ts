import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { notifyEmployeeUser } from "@/lib/notifications";
import { emitPlatformEvent } from "@/lib/integrations/dispatch";
import { z } from "zod";

const actionSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("manageLeave");
    const body = actionSchema.parse(await req.json());

    const leave = await prisma.leaveRequest.findFirst({
      where: {
        id: params.id,
        employee: { companyId: session.user.companyId },
      },
      include: { employee: true },
    });

    if (!leave) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (leave.status !== "PENDING") {
      return NextResponse.json({ error: "Already processed" }, { status: 400 });
    }

    const status = body.action === "approve" ? "APPROVED" : "REJECTED";

    const updated = await prisma.leaveRequest.update({
      where: { id: leave.id },
      data: {
        status,
        approvedById: session.user.id,
        approvedAt: new Date(),
      },
    });

    if (status === "APPROVED" && leave.type === "ANNUAL") {
      const year = new Date(leave.startDate).getFullYear();
      await prisma.leaveBalance.upsert({
        where: {
          employeeId_leaveType_year: {
            employeeId: leave.employeeId,
            leaveType: "ANNUAL",
            year,
          },
        },
        update: { usedDays: { increment: leave.days } },
        create: {
          employeeId: leave.employeeId,
          leaveType: "ANNUAL",
          year,
          entitledDays: 21,
          usedDays: leave.days,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        companyId: session.user.companyId,
        action: status,
        entityType: "LeaveRequest",
        entityId: leave.id,
        performedById: session.user.id,
      },
    });

    await notifyEmployeeUser({
      companyId: session.user.companyId,
      employeeId: leave.employeeId,
      type: "LEAVE_REVIEW",
      title:
        status === "APPROVED"
          ? "Your leave request was approved"
          : "Your leave request was sent back",
      body:
        status === "APPROVED"
          ? `${leave.type.replace(/_/g, " ")} leave (${leave.days} day${leave.days === 1 ? "" : "s"}) was approved.`
          : `${leave.type.replace(/_/g, " ")} leave was not approved. Open Leave for details.`,
      linkUrl: "/staff/leave",
      entityType: "LeaveRequest",
      entityId: leave.id,
    });

    emitPlatformEvent({
      companyId: session.user.companyId,
      event: status === "APPROVED" ? "leave.approved" : "leave.rejected",
      entityType: "LeaveRequest",
      entityId: leave.id,
      data: {
        type: leave.type,
        days: leave.days,
        employeeCode: leave.employee.employeeCode,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
