import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, handleApiError, requireAuth } from "@/lib/api-auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  name: z.string().trim().min(1).max(160),
  fileUrl: z.string().min(10).max(1_200_000),
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
    const ok =
      body.fileUrl.startsWith("data:image/") ||
      body.fileUrl.startsWith("data:application/pdf");
    if (!ok) {
      return NextResponse.json(
        { error: "Attachment must be an image or PDF" },
        { status: 400 }
      );
    }
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
    const row = await prisma.projectTaskAttachment.create({
      data: {
        taskId: task.id,
        name: body.name,
        fileUrl: body.fileUrl,
      },
      select: { id: true, name: true, createdAt: true },
    });
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
