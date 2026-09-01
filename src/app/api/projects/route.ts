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

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().max(40).optional().nullable(),
  tasks: z.array(z.string()).optional(),
});

const taskSelect = {
  id: true,
  name: true,
  status: true,
} as const;

export async function GET() {
  try {
    const session = await requireAuth();
    if (!can(session.user.role, "viewProjects")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const projects = await prisma.project.findMany({
      where: { companyId: session.user.companyId },
      include: { tasks: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(projects);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("manageProjects");
    const body = createSchema.parse(await req.json());
    const project = await prisma.project.create({
      data: {
        companyId: session.user.companyId,
        name: body.name,
        code: body.code?.trim() || null,
        tasks: {
          create: parseTaskNames(body.tasks).map((name) => ({ name })),
        },
      },
      include: { tasks: { orderBy: { name: "asc" }, select: taskSelect } },
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
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
