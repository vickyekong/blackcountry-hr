import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { z } from "zod";
import { enrichGoal, metricFieldsFromText, parseMetric } from "@/lib/performance/kpis";

const patchSchema = z.object({
  actual: z.string().trim().max(160).optional(),
  target: z.string().trim().min(1).max(160).optional(),
  title: z.string().trim().min(1).max(160).optional(),
  weight: z.number().int().min(1).max(100).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; goalId: string } }
) {
  try {
    const session = await requirePermission("viewEmployees");
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
    const target = body.target ?? existing.target;
    const actual = body.actual ?? existing.actual;
    const metrics =
      body.target != null || body.actual != null
        ? metricFieldsFromText(target, actual)
        : {};
    const goal = await prisma.performanceGoal.update({
      where: { id: params.goalId },
      data: {
        title: body.title,
        weight: body.weight,
        ...metrics,
        ...(body.actual != null && body.target == null
          ? { actualValue: parseMetric(body.actual) }
          : {}),
      },
    });
    return NextResponse.json(enrichGoal(goal));
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
