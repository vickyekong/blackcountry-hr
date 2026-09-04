import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireAuth,
  requirePermission,
  handleApiError,
} from "@/lib/api-auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { parseTaskNames } from "@/lib/projects/tasks";
import { PROJECT_STATUSES } from "@/lib/projects/labels";
import { projectInclude } from "@/lib/projects/query";
import { nairaToKobo } from "@/lib/money";
import { serializeBigInts } from "@/lib/payroll/config-mapper";

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().max(40).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  status: z.enum(PROJECT_STATUSES).optional(),
  managerEmployeeId: z.string().min(1).optional().nullable(),
  startsOn: z.string().optional().nullable(),
  dueOn: z.string().optional().nullable(),
  budgetNaira: z.number().min(0).optional(),
  tasks: z.array(z.string()).optional(),
  memberIds: z.array(z.string()).optional(),
});

function parseDay(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function GET() {
  try {
    const session = await requireAuth();
    if (!can(session.user.role, "viewProjects")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const projects = await prisma.project.findMany({
      where: { companyId: session.user.companyId },
      include: projectInclude,
      orderBy: { name: "asc" },
    });
    return NextResponse.json(serializeBigInts(projects));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("manageProjects");
    const body = createSchema.parse(await req.json());
    const memberIds = Array.from(
      new Set(
        [
          ...(body.memberIds ?? []),
          body.managerEmployeeId ?? "",
        ].filter(Boolean)
      )
    );
    if (memberIds.length) {
      const count = await prisma.employee.count({
        where: { companyId: session.user.companyId, id: { in: memberIds } },
      });
      if (count !== memberIds.length) {
        return NextResponse.json({ error: "Team member not found" }, { status: 400 });
      }
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
    const project = await prisma.project.create({
      data: {
        companyId: session.user.companyId,
        name: body.name,
        code: body.code?.trim() || null,
        description: body.description?.trim() || null,
        status: body.status ?? "ACTIVE",
        managerEmployeeId: body.managerEmployeeId || null,
        startsOn: parseDay(body.startsOn),
        dueOn: parseDay(body.dueOn),
        budgetKobo: body.budgetNaira != null ? nairaToKobo(body.budgetNaira) : 0n,
        tasks: {
          create: parseTaskNames(body.tasks).map((name) => ({ name })),
        },
        members: memberIds.length
          ? {
              create: memberIds.map((employeeId) => ({
                employeeId,
                role:
                  employeeId === body.managerEmployeeId ? "LEAD" : "MEMBER",
              })),
            }
          : undefined,
      },
      include: projectInclude,
    });
    await prisma.auditLog.create({
      data: {
        companyId: session.user.companyId,
        action: "CREATE",
        entityType: "Project",
        entityId: project.id,
        performedById: session.user.id,
        changes: { name: project.name, tasks: project.tasks.map((t) => t.name) },
      },
    });
    return NextResponse.json(serializeBigInts(project), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
