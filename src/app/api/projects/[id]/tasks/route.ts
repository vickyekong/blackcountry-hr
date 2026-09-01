import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
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
    const task = await prisma.projectTask.create({
      data: { projectId: project.id, name: body.name },
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
