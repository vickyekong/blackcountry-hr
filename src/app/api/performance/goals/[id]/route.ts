import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { can } from "@/lib/permissions";
import { ensurePerformanceSchema } from "@/lib/ensure-performance-schema";
import { enrichGoal, metricFieldsFromText, parseMetric } from "@/lib/performance/kpis";
import { REVIEW_PERIODS } from "@/lib/performance/labels";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  target: z.string().trim().min(1).max(160).optional(),
  actual: z.string().trim().max(160).optional(),
  unit: z.string().trim().max(40).optional().nullable(),
  weight: z.number().int().min(1).max(100).optional(),
  periodLabel: z.enum(REVIEW_PERIODS).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("viewEmployees");
    await ensurePerformanceSchema();
    const existing = await prisma.performanceGoal.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (
      existing.scope !== "INDIVIDUAL" &&
      !can(session.user.role, "manageEmployees")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = patchSchema.parse(await req.json());
    const target = body.target ?? existing.target;
    const actual = body.actual ?? existing.actual;
    const metrics =
      body.target != null || body.actual != null
        ? metricFieldsFromText(target, actual)
        : {};
    const goal = await prisma.performanceGoal.update({
      where: { id: existing.id },
      data: {
        title: body.title,
        unit: body.unit,
        weight: body.weight,
        periodLabel: body.periodLabel,
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("manageEmployees");
    await ensurePerformanceSchema();
    const existing = await prisma.performanceGoal.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.performanceGoal.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
