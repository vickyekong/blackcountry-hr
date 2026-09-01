import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireAuth,
  requirePermission,
  handleApiError,
} from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import {
  notifyEmployeeOfChangeReview,
  notifySuperAdminOfChangeRequest,
  reviewChangeRequest,
  submitChangeRequest,
} from "@/lib/lifecycle/change-requests";
import { displayName } from "@/lib/employees/data-quality";
import { canReviewChangeType } from "@/lib/permissions";
import { ensureStaffPortalSchema } from "@/lib/ensure-staff-portal-schema";
import {
  accessibleCompanyIds,
  findAccessibleChangeRequest,
} from "@/lib/tenancy/workspace";

const submitSchema = z.object({
  employeeId: z.string().min(1),
  type: z.enum(["BANK", "TAX_RELIEF", "NEXT_OF_KIN", "ADDRESS", "GENERAL"]),
  payload: z.record(z.string(), z.unknown()),
  note: z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  try {
    await ensureStaffPortalSchema();
    const session = await requirePermission("manageEmployees");
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope") ?? "pending";
    const companyIds = await accessibleCompanyIds(
      session.user.homeCompanyId || session.user.companyId,
      session.user.role
    );

    const requests = await prisma.employeeChangeRequest.findMany({
      where: {
        companyId: { in: companyIds },
        ...(scope === "pending" ? { status: "PENDING" } : {}),
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            department: true,
          },
        },
        company: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(requests);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("manageEmployees");
    const body = submitSchema.parse(await req.json());

    const employee = await prisma.employee.findFirst({
      where: { id: body.employeeId, companyId: session.user.companyId },
      select: { id: true, firstName: true, lastName: true, employeeCode: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const created = await submitChangeRequest({
      companyId: session.user.companyId,
      employeeId: body.employeeId,
      type: body.type,
      payload: body.payload,
      note: body.note,
    });

    await notifySuperAdminOfChangeRequest({
      companyId: session.user.companyId,
      requestId: created.id,
      employeeName: displayName(
        employee.firstName,
        employee.lastName,
        employee.employeeCode
      ),
      type: body.type,
      submittedByName: session.user.name,
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
          employeeId: body.employeeId,
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

const reviewSchema = z.object({
  requestId: z.string().min(1),
  action: z.enum(["approve", "reject"]),
  reviewNote: z.string().max(500).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    await ensureStaffPortalSchema();
    const session = await requireAuth();
    const body = reviewSchema.parse(await req.json());

    const existing = await findAccessibleChangeRequest(
      session.user,
      body.requestId
    );
    if (!existing) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    if (!canReviewChangeType(session.user.role, existing.type)) {
      return NextResponse.json(
        {
          error:
            existing.type === "BANK" || existing.type === "TAX_RELIEF"
              ? "Bank and tax-relief changes need Super Admin clearance"
              : "Forbidden",
        },
        { status: 403 }
      );
    }

    const updated = await reviewChangeRequest({
      companyId: existing.companyId,
      requestId: body.requestId,
      reviewerId: session.user.id,
      action: body.action,
      reviewNote: body.reviewNote,
    });

    await prisma.auditLog.create({
      data: {
        companyId: existing.companyId,
        action: body.action.toUpperCase(),
        entityType: "EmployeeChangeRequest",
        entityId: updated.id,
        performedById: session.user.id,
        changes: { reviewNote: body.reviewNote },
      },
    });

    await prisma.notification.updateMany({
      where: {
        entityType: "EmployeeChangeRequest",
        entityId: updated.id,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    await notifyEmployeeOfChangeReview({
      employeeId: existing.employeeId,
      companyId: existing.companyId,
      requestId: updated.id,
      type: existing.type,
      action: body.action,
      reviewNote: body.reviewNote,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return handleApiError(error);
  }
}
