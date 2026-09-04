import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requirePermission } from "@/lib/api-auth";
import { serializeBigInts } from "@/lib/payroll/config-mapper";

const patchSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("manageCompensation");
    const existing = await prisma.salaryLoan.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }
    if (existing.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending loans can be approved or rejected" },
        { status: 400 }
      );
    }
    const body = patchSchema.parse(await req.json());
    const updated = await prisma.salaryLoan.update({
      where: { id: existing.id },
      data: {
        status: body.action === "approve" ? "APPROVED" : "REJECTED",
        approvedById: session.user.id,
        approvedAt: new Date(),
      },
    });
    return NextResponse.json(serializeBigInts(updated));
  } catch (error) {
    return handleApiError(error);
  }
}
