import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, requirePermission } from "@/lib/api-auth";
import { serializeBigInts } from "@/lib/payroll/config-mapper";
import {
  structureData,
  structureSchema,
} from "@/lib/payroll/structure-input";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("manageCompensation");
    const existing = await prisma.salaryStructure.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Structure not found" }, { status: 404 });
    }
    const body = structureSchema.parse(await req.json());
    const row = await prisma.salaryStructure.update({
      where: { id: existing.id },
      data: structureData(body),
    });
    return NextResponse.json(serializeBigInts(row));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("manageCompensation");
    const existing = await prisma.salaryStructure.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Structure not found" }, { status: 404 });
    }
    await prisma.salaryStructure.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
