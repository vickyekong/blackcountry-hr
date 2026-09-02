import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { serializeBigInts } from "@/lib/payroll/config-mapper";

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

    const assets = await prisma.companyAsset.findMany({
      where: {
        companyId: session.user.companyId,
        assignedEmployeeId: params.id,
      },
      orderBy: { assetCode: "asc" },
    });
    return NextResponse.json(serializeBigInts(assets));
  } catch (error) {
    return handleApiError(error);
  }
}
