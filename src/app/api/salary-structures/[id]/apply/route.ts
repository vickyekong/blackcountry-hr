import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requirePermission } from "@/lib/api-auth";
import { compensationFromStructure } from "@/lib/payroll/money-math";
import { serializeBigInts } from "@/lib/payroll/config-mapper";

const applySchema = z.object({
  employeeIds: z.array(z.string().min(1)).min(1).max(500),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("manageCompensation");
    const structure = await prisma.salaryStructure.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    });
    if (!structure) {
      return NextResponse.json({ error: "Structure not found" }, { status: 404 });
    }
    const body = applySchema.parse(await req.json());
    const pay = compensationFromStructure(structure);
    const result = await prisma.employee.updateMany({
      where: {
        id: { in: body.employeeIds },
        companyId: session.user.companyId,
      },
      data: {
        salaryStructureId: structure.id,
        ...pay,
      },
    });
    return NextResponse.json(serializeBigInts({ updated: result.count, pay }));
  } catch (error) {
    return handleApiError(error);
  }
}
