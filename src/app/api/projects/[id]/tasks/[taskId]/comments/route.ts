import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, handleApiError, requireAuth } from "@/lib/api-auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; taskId: string } }
) {
  try {
    const session = await requireAuth();
    if (!can(session.user.role, "viewProjects")) {
      throw new AuthError("Forbidden", 403);
    }
    const body = createSchema.parse(await req.json());
    const task = await prisma.projectTask.findFirst({
      where: {
        id: params.taskId,
        projectId: params.id,
        project: { companyId: session.user.companyId },
      },
      select: { id: true },
    });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    const comment = await prisma.projectTaskComment.create({
      data: {
        taskId: task.id,
        authorUserId: session.user.id,
        body: body.body,
      },
      include: { author: { select: { id: true, name: true } } },
    });
    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
