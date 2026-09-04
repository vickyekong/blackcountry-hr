import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  AuthError,
  handleApiError,
  requireAuth,
} from "@/lib/api-auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { TASK_PRIORITIES, TASK_PROGRESS } from "@/lib/projects/labels";
import { canManageTaskProgress } from "@/lib/projects/access";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
  progress: z.enum(TASK_PROGRESS).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assigneeEmployeeId: z.string().min(1).optional().nullable(),
  dueOn: z.string().optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; taskId: string } }
) {
  try {
    const session = await requireAuth();
    if (!can(session.user.role, "viewProjects")) {
      throw new AuthError("Forbidden", 403);
    }
    const body = patchSchema.parse(await req.json());
    const existing = await prisma.projectTask.findFirst({
      where: {
        id: params.taskId,
        projectId: params.id,
        project: { companyId: session.user.companyId },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const manage = can(session.user.role, "manageProjects");
    const ownProgress = canManageTaskProgress({
      role: session.user.role,
      employeeId: session.user.employeeId,
      assigneeEmployeeId: existing.assigneeEmployeeId,
    });
    if (!manage) {
      const onlyProgress =
        body.progress !== undefined &&
        body.name === undefined &&
        body.status === undefined &&
        body.priority === undefined &&
        body.assigneeEmployeeId === undefined &&
        body.dueOn === undefined;
      if (!onlyProgress || !ownProgress) {
        throw new AuthError("Forbidden", 403);
      }
    }
    const task = await prisma.projectTask.update({
      where: { id: existing.id },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.status ? { status: body.status } : {}),
        ...(body.progress ? { progress: body.progress } : {}),
        ...(body.priority ? { priority: body.priority } : {}),
        ...(body.assigneeEmployeeId !== undefined
          ? { assigneeEmployeeId: body.assigneeEmployeeId }
          : {}),
        ...(body.dueOn !== undefined
          ? { dueOn: body.dueOn ? new Date(body.dueOn) : null }
          : {}),
      },
    });
    return NextResponse.json(task);
  } catch (error) {
    return handleApiError(error);
  }
}
