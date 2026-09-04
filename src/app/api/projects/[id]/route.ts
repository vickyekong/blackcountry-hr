import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { PROJECT_STATUSES } from "@/lib/projects/labels";
import { projectInclude } from "@/lib/projects/query";
import { nairaToKobo } from "@/lib/money";
import { serializeBigInts } from "@/lib/payroll/config-mapper";

const patchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  code: z.string().trim().max(40).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(PROJECT_STATUSES).optional(),
  managerEmployeeId: z.string().min(1).optional().nullable(),
  startsOn: z.string().optional().nullable(),
  dueOn: z.string().optional().nullable(),
  budgetNaira: z.number().min(0).optional(),
  members: z
    .array(
      z.object({
        employeeId: z.string().min(1),
        plannedMinutesPerWeek: z.number().int().min(0).max(7 * 24 * 60).default(0),
        role: z.enum(["LEAD", "MEMBER"]).optional(),
      })
    )
    .optional(),
});

function parseDay(value?: string | null) {
  if (value === undefined) return undefined;
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("manageProjects");
    const body = patchSchema.parse(await req.json());
    const existing = await prisma.project.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (body.managerEmployeeId) {
      const manager = await prisma.employee.findFirst({
        where: { id: body.managerEmployeeId, companyId: session.user.companyId },
        select: { id: true },
      });
      if (!manager) {
        return NextResponse.json({ error: "Project manager not found" }, { status: 400 });
      }
    }
    if (body.members) {
      const ids = body.members.map((m) => m.employeeId);
      const count = await prisma.employee.count({
        where: { companyId: session.user.companyId, id: { in: ids } },
      });
      if (ids.length && count !== ids.length) {
        return NextResponse.json({ error: "Team member not found" }, { status: 400 });
      }
      await prisma.projectMember.deleteMany({ where: { projectId: existing.id } });
      if (body.members.length) {
        await prisma.projectMember.createMany({
          data: body.members.map((m) => ({
            projectId: existing.id,
            employeeId: m.employeeId,
            plannedMinutesPerWeek: m.plannedMinutesPerWeek,
            role:
              m.role ??
              (m.employeeId === (body.managerEmployeeId ?? existing.managerEmployeeId)
                ? "LEAD"
                : "MEMBER"),
          })),
        });
      }
    }
    const project = await prisma.project.update({
      where: { id: existing.id },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.code !== undefined ? { code: body.code } : {}),
        ...(body.description !== undefined
          ? { description: body.description }
          : {}),
        ...(body.status ? { status: body.status } : {}),
        ...(body.managerEmployeeId !== undefined
          ? { managerEmployeeId: body.managerEmployeeId }
          : {}),
        ...(body.startsOn !== undefined ? { startsOn: parseDay(body.startsOn) } : {}),
        ...(body.dueOn !== undefined ? { dueOn: parseDay(body.dueOn) } : {}),
        ...(body.budgetNaira !== undefined
          ? { budgetKobo: nairaToKobo(body.budgetNaira) }
          : {}),
      },
      include: projectInclude,
    });
    return NextResponse.json(serializeBigInts(project));
  } catch (error) {
    return handleApiError(error);
  }
}
