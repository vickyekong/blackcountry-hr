import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { TASK_PRIORITIES, TASK_PROGRESS } from "@/lib/projects/labels";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  assigneeEmployeeId: z.string().min(1).optional().nullable(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  progress: z.enum(TASK_PROGRESS).optional(),
  dueOn: z.string().optional().nullable(),
  parentTaskId: z.string().min(1).optional().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("manageProjects");
    const body = createSchema.parse(await req.json());
    const project = await prisma.project.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (body.parentTaskId) {
      const parent = await prisma.projectTask.findFirst({
        where: { id: body.parentTaskId, projectId: project.id },
        select: { id: true },
      });
      if (!parent) {
        return NextResponse.json({ error: "Parent task not found" }, { status: 400 });
      }
    }
    const task = await prisma.projectTask.create({
      data: {
        projectId: project.id,
        name: body.name,
        assigneeEmployeeId: body.assigneeEmployeeId || null,
        priority: body.priority ?? "MEDIUM",
        progress: body.progress ?? "TODO",
        dueOn: body.dueOn ? new Date(body.dueOn) : null,
        parentTaskId: body.parentTaskId || null,
      },
    });
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    const duplicate =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002";
    if (duplicate) {
      return NextResponse.json(
        { error: "That task already exists on this project." },
        { status: 400 }
      );
    }
    return handleApiError(error);
  }
}
