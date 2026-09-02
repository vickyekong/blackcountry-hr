import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requireStaffEmployee } from "@/lib/api-auth";
import { ensureTimeSchema } from "@/lib/ensure-time-schema";
import { serializeBigInts } from "@/lib/payroll/config-mapper";

const patchSchema = z.object({
  action: z.literal("cancel"),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireStaffEmployee();
    await ensureTimeSchema();
    patchSchema.parse(await req.json());
    const existing = await prisma.overtimeRequest.findFirst({
      where: {
        id: params.id,
        employeeId: session.employeeId,
        companyId: session.user.companyId,
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    if (existing.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending overtime can be cancelled" },
        { status: 400 }
      );
    }
    const updated = await prisma.overtimeRequest.update({
      where: { id: existing.id },
      data: { status: "REJECTED" },
    });
    return NextResponse.json(serializeBigInts(updated));
  } catch (error) {
    return handleApiError(error);
  }
}
