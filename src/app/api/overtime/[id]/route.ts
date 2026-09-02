import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requirePermission } from "@/lib/api-auth";
import { ensureTimeSchema } from "@/lib/ensure-time-schema";
import { quoteOvertimeKobo } from "@/lib/time/overtime";
import { serializeBigInts } from "@/lib/payroll/config-mapper";

const patchSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("manageAttendance");
    await ensureTimeSchema();
    const body = patchSchema.parse(await req.json());
    const existing = await prisma.overtimeRequest.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    if (existing.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending overtime can be approved or rejected" },
        { status: 400 }
      );
    }

    if (body.action === "reject") {
      const updated = await prisma.overtimeRequest.update({
        where: { id: existing.id },
        data: {
          status: "REJECTED",
          approvedById: session.user.id,
          approvedAt: new Date(),
        },
      });
      return NextResponse.json(serializeBigInts(updated));
    }

    const amountKobo =
      existing.amountKobo && existing.amountKobo > 0n
        ? existing.amountKobo
        : await quoteOvertimeKobo({
            companyId: session.user.companyId,
            employeeId: existing.employeeId,
            workDate: existing.workDate,
            minutes: existing.minutes,
          });

    const updated = await prisma.overtimeRequest.update({
      where: { id: existing.id },
      data: {
        status: "APPROVED",
        amountKobo,
        approvedById: session.user.id,
        approvedAt: new Date(),
      },
    });
    return NextResponse.json(serializeBigInts(updated));
  } catch (error) {
    return handleApiError(error);
  }
}
