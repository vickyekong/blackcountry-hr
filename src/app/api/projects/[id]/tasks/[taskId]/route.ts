import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; taskId: string } }
) {
  try {
    const session = await requirePermission("manageProjects");
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
    const task = await prisma.projectTask.update({
      where: { id: existing.id },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.status ? { status: body.status } : {}),
      },
    });
    return NextResponse.json(task);
  } catch (error) {
    return handleApiError(error);
  }
}
