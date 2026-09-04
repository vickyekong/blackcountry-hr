import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requirePermission } from "@/lib/api-auth";
import { nairaToKobo } from "@/lib/money";
import { serializeBigInts } from "@/lib/payroll/config-mapper";

const patchSchema = z.object({
  action: z.enum(["approve", "reject"]),
  approvedNaira: z.number().positive().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("manageCompensation");
    const existing = await prisma.salaryAdvance.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Advance not found" }, { status: 404 });
    }
    if (existing.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending advances can be approved or rejected" },
        { status: 400 }
      );
    }
    const body = patchSchema.parse(await req.json());
    if (body.action === "reject") {
      const updated = await prisma.salaryAdvance.update({
        where: { id: existing.id },
        data: {
          status: "REJECTED",
          approvedById: session.user.id,
          approvedAt: new Date(),
        },
      });
      return NextResponse.json(serializeBigInts(updated));
    }
    const approvedKobo = body.approvedNaira
      ? nairaToKobo(body.approvedNaira)
      : existing.requestedKobo;
    const updated = await prisma.salaryAdvance.update({
      where: { id: existing.id },
      data: {
        status: "APPROVED",
        approvedKobo,
        approvedById: session.user.id,
        approvedAt: new Date(),
      },
    });
    return NextResponse.json(serializeBigInts(updated));
  } catch (error) {
    return handleApiError(error);
  }
}
