import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { SKILL_LEVELS } from "@/lib/people/labels";
import { z } from "zod";

const createSchema = z.object({
  skillId: z.string().optional(),
  name: z.string().trim().min(1).max(80).optional(),
  level: z.enum(SKILL_LEVELS).default("INTERMEDIATE"),
});

async function loadEmployee(companyId: string, employeeId: string) {
  return prisma.employee.findFirst({
    where: { id: employeeId, companyId },
    select: { id: true },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("viewEmployees");
    const employee = await loadEmployee(session.user.companyId, params.id);
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const rows = await prisma.employeeSkill.findMany({
      where: { employeeId: params.id },
      include: { skill: { select: { id: true, name: true } } },
      orderBy: { skill: { name: "asc" } },
    });

    return NextResponse.json(
      rows.map((row) => ({
        id: row.id,
        skillId: row.skillId,
        name: row.skill.name,
        level: row.level,
      }))
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("manageEmployees");
    const employee = await loadEmployee(session.user.companyId, params.id);
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const body = createSchema.parse(await req.json());
    let skillId = body.skillId;
    if (!skillId && body.name) {
      const skill = await prisma.skill.upsert({
        where: {
          companyId_name: {
            companyId: session.user.companyId,
            name: body.name,
          },
        },
        create: { companyId: session.user.companyId, name: body.name },
        update: {},
      });
      skillId = skill.id;
    }
    if (!skillId) {
      return NextResponse.json(
        { error: "Choose a skill or type a new name" },
        { status: 400 }
      );
    }

    const skill = await prisma.skill.findFirst({
      where: { id: skillId, companyId: session.user.companyId },
    });
    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    const row = await prisma.employeeSkill.upsert({
      where: {
        employeeId_skillId: {
          employeeId: params.id,
          skillId,
        },
      },
      create: {
        employeeId: params.id,
        skillId,
        level: body.level,
      },
      update: { level: body.level },
      include: { skill: { select: { name: true } } },
    });

    await prisma.auditLog.create({
      data: {
        companyId: session.user.companyId,
        action: "UPDATE",
        entityType: "EmployeeSkill",
        entityId: row.id,
        performedById: session.user.id,
        changes: {
          employeeId: params.id,
          skill: skill.name,
          level: body.level,
        },
      },
    });

    return NextResponse.json(
      {
        id: row.id,
        skillId: row.skillId,
        name: row.skill.name,
        level: row.level,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
