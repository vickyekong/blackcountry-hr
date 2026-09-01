import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import {
  disableStaffPortal,
  enableStaffPortal,
  TenancyError,
} from "@/lib/tenancy/bootstrap-company";
import { ensureStaffPortalSchema } from "@/lib/ensure-staff-portal-schema";
import { isEmploymentEnded } from "@/lib/employees/status";

const enableSchema = z.object({
  email: z.string().trim().email().max(180),
  password: z.string().min(8).max(128),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("manageEmployees");
    await ensureStaffPortalSchema();
    const body = enableSchema.parse(await req.json());

    const employee = await prisma.employee.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
      select: { id: true, status: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    if (isEmploymentEnded(employee.status)) {
      return NextResponse.json(
        { error: "This person has left — staff portal cannot be enabled" },
        { status: 400 }
      );
    }

    const user = await enableStaffPortal({
      companyId: session.user.companyId,
      employeeId: employee.id,
      email: body.email,
      password: body.password,
    });

    await prisma.auditLog.create({
      data: {
        companyId: session.user.companyId,
        action: "ENABLE_STAFF_PORTAL",
        entityType: "Employee",
        entityId: employee.id,
        performedById: session.user.id,
        changes: { email: user.email },
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof TenancyError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("manageEmployees");
    await disableStaffPortal({
      companyId: session.user.companyId,
      employeeId: params.id,
    });
    await prisma.auditLog.create({
      data: {
        companyId: session.user.companyId,
        action: "DISABLE_STAFF_PORTAL",
        entityType: "Employee",
        entityId: params.id,
        performedById: session.user.id,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof TenancyError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return handleApiError(error);
  }
}
