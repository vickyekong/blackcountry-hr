import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, handleApiError } from "@/lib/api-auth";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; skillId: string } }
) {
  try {
    const session = await requirePermission("manageEmployees");
    const employee = await prisma.employee.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
      select: { id: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const existing = await prisma.employeeSkill.findFirst({
      where: { id: params.skillId, employeeId: params.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.employeeSkill.delete({ where: { id: params.skillId } });
    await prisma.auditLog.create({
      data: {
        companyId: session.user.companyId,
        action: "DELETE",
        entityType: "EmployeeSkill",
        entityId: params.skillId,
        performedById: session.user.id,
        changes: { employeeId: params.id, skillId: existing.skillId },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
