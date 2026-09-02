import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export async function GET() {
  try {
    const session = await requirePermission("viewEmployees");
    const skills = await prisma.skill.findMany({
      where: { companyId: session.user.companyId },
      orderBy: { name: "asc" },
      include: { _count: { select: { employees: true } } },
    });
    return NextResponse.json(
      skills.map((skill) => ({
        id: skill.id,
        name: skill.name,
        employeeCount: skill._count.employees,
      }))
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("manageEmployees");
    const body = createSchema.parse(await req.json());
    const existing = await prisma.skill.findUnique({
      where: {
        companyId_name: {
          companyId: session.user.companyId,
          name: body.name,
        },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Skill already exists" },
        { status: 409 }
      );
    }

    const skill = await prisma.skill.create({
      data: {
        companyId: session.user.companyId,
        name: body.name,
      },
    });

    await prisma.auditLog.create({
      data: {
        companyId: session.user.companyId,
        action: "CREATE",
        entityType: "Skill",
        entityId: skill.id,
        performedById: session.user.id,
        changes: { name: skill.name },
      },
    });

    return NextResponse.json(
      { id: skill.id, name: skill.name, employeeCount: 0 },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
