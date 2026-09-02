import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { z } from "zod";

const patchSchema = z.object({
  actual: z.string().trim().max(160).optional(),
  target: z.string().trim().min(1).max(160).optional(),
  title: z.string().trim().min(1).max(160).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; goalId: string } }
) {
  try {
    const session = await requirePermission("manageEmployees");
    const body = patchSchema.parse(await req.json());
    const existing = await prisma.performanceGoal.findFirst({
      where: {
        id: params.goalId,
        employeeId: params.id,
        companyId: session.user.companyId,
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const goal = await prisma.performanceGoal.update({
      where: { id: params.goalId },
      data: body,
    });
    return NextResponse.json(goal);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; goalId: string } }
) {
  try {
    const session = await requirePermission("manageEmployees");
    const existing = await prisma.performanceGoal.findFirst({
      where: {
        id: params.goalId,
        employeeId: params.id,
        companyId: session.user.companyId,
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.performanceGoal.delete({ where: { id: params.goalId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
