import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, requirePermission } from "@/lib/api-auth";
import { serializeBigInts } from "@/lib/payroll/config-mapper";
import { structureData, structureSchema } from "@/lib/payroll/structure-input";

export async function GET() {
  try {
    const session = await requirePermission("manageCompensation");
    const rows = await prisma.salaryStructure.findMany({
      where: { companyId: session.user.companyId },
      include: { _count: { select: { employees: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(serializeBigInts(rows));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("manageCompensation");
    const body = structureSchema.parse(await req.json());
    const row = await prisma.salaryStructure.create({
      data: {
        companyId: session.user.companyId,
        ...structureData(body),
      },
    });
    return NextResponse.json(serializeBigInts(row), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
