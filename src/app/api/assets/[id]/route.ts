import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { serializeBigInts } from "@/lib/payroll/config-mapper";
import { ASSET_STATUSES } from "@/lib/people/labels";
import { z } from "zod";

const updateSchema = z.object({
  assignedEmployeeId: z.string().nullable().optional(),
  status: z.enum(ASSET_STATUSES).optional(),
  condition: z.string().trim().max(80).nullable().optional(),
  notes: z.string().trim().max(400).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("manageEmployees");
    const body = updateSchema.parse(await req.json());
    const existing = await prisma.companyAsset.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let assignedEmployeeId = existing.assignedEmployeeId;
    let assignedAt = existing.assignedAt;
    let status = body.status ?? existing.status;

    if (body.assignedEmployeeId !== undefined) {
      if (!body.assignedEmployeeId) {
        assignedEmployeeId = null;
        assignedAt = null;
        if (status === "ASSIGNED") status = "AVAILABLE";
      } else {
        const employee = await prisma.employee.findFirst({
          where: {
            id: body.assignedEmployeeId,
            companyId: session.user.companyId,
          },
          select: { id: true },
        });
        if (!employee) {
          return NextResponse.json(
            { error: "Employee not found in this company" },
            { status: 400 }
          );
        }
        assignedEmployeeId = employee.id;
        assignedAt = new Date();
        status = "ASSIGNED";
      }
    }

    if (status === "RETIRED") {
      assignedEmployeeId = null;
      assignedAt = null;
    }
    if (status === "AVAILABLE") {
      assignedEmployeeId = null;
      assignedAt = null;
    }

    const asset = await prisma.companyAsset.update({
      where: { id: params.id },
      data: {
        assignedEmployeeId,
        assignedAt,
        status,
        ...(body.condition !== undefined && {
          condition: body.condition?.trim() || null,
        }),
        ...(body.notes !== undefined && { notes: body.notes?.trim() || null }),
      },
      include: {
        assignedEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        companyId: session.user.companyId,
        action: "UPDATE",
        entityType: "CompanyAsset",
        entityId: asset.id,
        performedById: session.user.id,
        changes: body,
      },
    });

    return NextResponse.json(serializeBigInts(asset));
  } catch (error) {
    return handleApiError(error);
  }
}
