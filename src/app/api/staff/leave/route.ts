import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requireStaffEmployee } from "@/lib/api-auth";
import { createLeaveRequest, LeaveServiceError } from "@/lib/leave/service";
import { notifyUsersInRoles } from "@/lib/notifications";
import { displayName } from "@/lib/employees/data-quality";

const leaveSchema = z.object({
  type: z.enum(["ANNUAL", "SICK", "MATERNITY", "PATERNITY", "UNPAID"]),
  startDate: z.string(),
  endDate: z.string(),
  days: z.number().min(1).optional(),
  reason: z.string().optional(),
});

export async function GET() {
  try {
    const session = await requireStaffEmployee();
    const requests = await prisma.leaveRequest.findMany({
      where: { employeeId: session.employeeId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(requests);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireStaffEmployee();
    const body = leaveSchema.parse(await req.json());

    const { request, employee } = await createLeaveRequest({
      companyId: session.user.companyId,
      employeeId: session.employeeId,
      type: body.type,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      days: body.days,
      reason: body.reason,
    });

    await notifyUsersInRoles({
      companyId: session.user.companyId,
      roles: ["HR_ADMIN", "SUPER_ADMIN"],
      type: "LEAVE_REQUEST",
      title: "Leave request from staff",
      body: `${displayName(employee.firstName, employee.lastName, employee.employeeCode)} applied for ${body.type.replace(/_/g, " ").toLowerCase()} leave (${request.days} day${request.days === 1 ? "" : "s"}).`,
      linkUrl: "/leave",
      entityType: "LeaveRequest",
      entityId: request.id,
    });

    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    if (error instanceof LeaveServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return handleApiError(error);
  }
}
