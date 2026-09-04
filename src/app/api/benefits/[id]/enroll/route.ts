import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requirePermission } from "@/lib/api-auth";
import { serializeBigInts } from "@/lib/payroll/config-mapper";

const enrollSchema = z.object({
  employeeId: z.string().min(1),
  action: z.enum(["enroll", "end"]).default("enroll"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("manageCompensation");
    const plan = await prisma.benefitPlan.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    });
    if (!plan) {
      return NextResponse.json({ error: "Benefit not found" }, { status: 404 });
    }
    const body = enrollSchema.parse(await req.json());
    const employee = await prisma.employee.findFirst({
      where: { id: body.employeeId, companyId: session.user.companyId },
      select: { id: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    if (body.action === "end") {
      const updated = await prisma.employeeBenefit.updateMany({
        where: { planId: plan.id, employeeId: employee.id, status: "ACTIVE" },
        data: { status: "ENDED", endedAt: new Date() },
      });
      return NextResponse.json({ ended: updated.count });
    }

    const row = await prisma.employeeBenefit.upsert({
      where: {
        employeeId_planId: { employeeId: employee.id, planId: plan.id },
      },
      create: {
        employeeId: employee.id,
        planId: plan.id,
        status: "ACTIVE",
      },
      update: { status: "ACTIVE", endedAt: null, startedAt: new Date() },
    });
    return NextResponse.json(serializeBigInts(row), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
