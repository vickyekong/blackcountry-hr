import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requirePermission } from "@/lib/api-auth";
import { serializeBigInts } from "@/lib/payroll/config-mapper";

const patchSchema = z.object({
  status: z.enum(["ACTIVE", "ENDED"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("manageCompensation");
    const existing = await prisma.recurringDeduction.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Deduction not found" }, { status: 404 });
    }
    const body = patchSchema.parse(await req.json());
    const row = await prisma.recurringDeduction.update({
      where: { id: existing.id },
      data: { status: body.status },
    });
    return NextResponse.json(serializeBigInts(row));
  } catch (error) {
    return handleApiError(error);
  }
}
