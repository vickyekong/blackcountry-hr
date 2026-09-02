import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("manageEmployees");
    const body = updateSchema.parse(await req.json());
    const existing = await prisma.skill.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const clash = await prisma.skill.findFirst({
      where: {
        companyId: session.user.companyId,
        name: body.name,
        NOT: { id: params.id },
      },
    });
    if (clash) {
      return NextResponse.json(
        { error: "Skill already exists" },
        { status: 409 }
      );
    }

    const skill = await prisma.skill.update({
      where: { id: params.id },
      data: { name: body.name },
    });

    await prisma.auditLog.create({
      data: {
        companyId: session.user.companyId,
        action: "UPDATE",
        entityType: "Skill",
        entityId: skill.id,
        performedById: session.user.id,
        changes: { from: existing.name, to: skill.name },
      },
    });

    return NextResponse.json({ id: skill.id, name: skill.name });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("manageEmployees");
    const existing = await prisma.skill.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const inUse = await prisma.employeeSkill.count({
      where: { skillId: params.id },
    });
    if (inUse > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete “${existing.name}” while ${inUse} employee(s) have it`,
        },
        { status: 400 }
      );
    }

    await prisma.skill.delete({ where: { id: params.id } });
    await prisma.auditLog.create({
      data: {
        companyId: session.user.companyId,
        action: "DELETE",
        entityType: "Skill",
        entityId: params.id,
        performedById: session.user.id,
        changes: { name: existing.name },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
