import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requireStaffEmployee } from "@/lib/api-auth";
import {
  notifyReviewersOfChangeRequest,
  submitChangeRequest,
} from "@/lib/lifecycle/change-requests";
import { displayName } from "@/lib/employees/data-quality";
import { ensureStaffPortalSchema } from "@/lib/ensure-staff-portal-schema";

const submitSchema = z.object({
  type: z.enum(["BANK", "TAX_RELIEF", "NEXT_OF_KIN", "ADDRESS", "GENERAL"]),
  payload: z.record(z.string(), z.unknown()),
  note: z.string().max(500).optional(),
});

export async function GET() {
  try {
    const session = await requireStaffEmployee();
    await ensureStaffPortalSchema();
    const requests = await prisma.employeeChangeRequest.findMany({
      where: {
        companyId: session.user.companyId,
        employeeId: session.employeeId,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(requests);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireStaffEmployee();
    await ensureStaffPortalSchema();
    const body = submitSchema.parse(await req.json());

    const employee = await prisma.employee.findFirst({
      where: { id: session.employeeId, companyId: session.user.companyId },
      select: { firstName: true, lastName: true, employeeCode: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Staff record not found" }, { status: 404 });
    }

    const created = await submitChangeRequest({
      companyId: session.user.companyId,
      employeeId: session.employeeId,
      type: body.type,
      payload: body.payload,
      note: body.note,
    });

    const employeeName = displayName(
      employee.firstName,
      employee.lastName,
      employee.employeeCode
    );

    await notifyReviewersOfChangeRequest({
      companyId: session.user.companyId,
      requestId: created.id,
      employeeName,
      type: body.type,
      submittedByName: session.user.name,
      fromStaff: true,
    });

    await prisma.auditLog.create({
      data: {
        companyId: session.user.companyId,
        action: "CREATE",
        entityType: "EmployeeChangeRequest",
        entityId: created.id,
        performedById: session.user.id,
        changes: {
          type: body.type,
          source: "staff_portal",
          payload: body.payload as Record<string, string>,
        },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return handleApiError(error);
  }
}
