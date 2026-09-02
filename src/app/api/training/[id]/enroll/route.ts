import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { TRAINING_STATUSES } from "@/lib/talent/labels";
import { z } from "zod";

const enrollSchema = z.object({
  employeeId: z.string(),
  status: z.enum(TRAINING_STATUSES).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("manageEmployees");
    const program = await prisma.trainingProgram.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    });
    if (!program) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const body = enrollSchema.parse(await req.json());
    const employee = await prisma.employee.findFirst({
      where: { id: body.employeeId, companyId: session.user.companyId },
      select: { id: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 400 });
    }
    const status = body.status ?? "ASSIGNED";
    const row = await prisma.trainingEnrollment.upsert({
      where: {
        programId_employeeId: {
          programId: params.id,
          employeeId: employee.id,
        },
      },
      create: {
        programId: params.id,
        employeeId: employee.id,
        status,
        completedAt: status === "COMPLETED" ? new Date() : null,
      },
      update: {
        status,
        completedAt: status === "COMPLETED" ? new Date() : null,
      },
    });
    await prisma.auditLog.create({
      data: {
        companyId: session.user.companyId,
        action: "UPDATE",
        entityType: "TrainingEnrollment",
        entityId: row.id,
        performedById: session.user.id,
        changes: { programId: params.id, employeeId: employee.id, status },
      },
    });
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
