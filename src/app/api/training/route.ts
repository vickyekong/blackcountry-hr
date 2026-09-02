import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { ensureTalentSchema } from "@/lib/ensure-talent-schema";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional().nullable(),
  required: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await requirePermission("viewEmployees");
    await ensureTalentSchema();
    const programs = await prisma.trainingProgram.findMany({
      where: { companyId: session.user.companyId },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { enrollments: true } },
        enrollments: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true,
              },
            },
          },
        },
      },
    });
    return NextResponse.json(
      programs.map((program) => ({
        id: program.id,
        name: program.name,
        description: program.description,
        required: program.required,
        enrollmentCount: program._count.enrollments,
        enrollments: program.enrollments.map((row) => ({
          id: row.id,
          status: row.status,
          assignedAt: row.assignedAt,
          completedAt: row.completedAt,
          employee: row.employee,
        })),
      }))
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("manageEmployees");
    await ensureTalentSchema();
    const body = createSchema.parse(await req.json());
    const existing = await prisma.trainingProgram.findUnique({
      where: {
        companyId_name: {
          companyId: session.user.companyId,
          name: body.name,
        },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Training programme already exists" },
        { status: 409 }
      );
    }
    const program = await prisma.trainingProgram.create({
      data: {
        companyId: session.user.companyId,
        name: body.name,
        description: body.description?.trim() || null,
        required: body.required ?? false,
      },
    });
    await prisma.auditLog.create({
      data: {
        companyId: session.user.companyId,
        action: "CREATE",
        entityType: "TrainingProgram",
        entityId: program.id,
        performedById: session.user.id,
        changes: { name: program.name },
      },
    });
    return NextResponse.json(program, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
