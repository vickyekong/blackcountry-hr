import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { createLeaveRequest, LeaveServiceError } from "@/lib/leave/service";
import { z } from "zod";

const leaveSchema = z.object({
  employeeId: z.string().min(1),
  type: z.enum(["ANNUAL", "SICK", "MATERNITY", "PATERNITY", "UNPAID"]),
  startDate: z.string(),
  endDate: z.string(),
  days: z.number().min(1).optional(),
  reason: z.string().optional(),
});

export async function GET() {
  try {
    const session = await requirePermission("manageLeave");

    const requests = await prisma.leaveRequest.findMany({
      where: { employee: { companyId: session.user.companyId } },
      include: {
        employee: {
          select: { firstName: true, lastName: true, employeeCode: true },
        },
        approvedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(requests);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("manageLeave");
    const body = leaveSchema.parse(await req.json());

    const { request } = await createLeaveRequest({
      companyId: session.user.companyId,
      employeeId: body.employeeId,
      type: body.type,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      days: body.days,
      reason: body.reason,
    });

    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    if (error instanceof LeaveServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return handleApiError(error);
  }
}
