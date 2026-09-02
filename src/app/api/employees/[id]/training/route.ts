import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, handleApiError } from "@/lib/api-auth";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("viewEmployees");
    const employee = await prisma.employee.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
      select: { id: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    const rows = await prisma.trainingEnrollment.findMany({
      where: { employeeId: params.id },
      include: {
        program: { select: { id: true, name: true, required: true } },
      },
      orderBy: { assignedAt: "desc" },
    });
    return NextResponse.json(
      rows.map((row) => ({
        id: row.id,
        status: row.status,
        assignedAt: row.assignedAt,
        completedAt: row.completedAt,
        program: row.program,
      }))
    );
  } catch (error) {
    return handleApiError(error);
  }
}
