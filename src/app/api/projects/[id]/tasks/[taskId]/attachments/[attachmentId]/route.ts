import { NextRequest, NextResponse } from "next/server";
import { AuthError, handleApiError, requireAuth } from "@/lib/api-auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; taskId: string; attachmentId: string } }
) {
  try {
    const session = await requireAuth();
    if (!can(session.user.role, "viewProjects")) {
      throw new AuthError("Forbidden", 403);
    }
    const row = await prisma.projectTaskAttachment.findFirst({
      where: {
        id: params.attachmentId,
        taskId: params.taskId,
        task: {
          projectId: params.id,
          project: { companyId: session.user.companyId },
        },
      },
    });
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (error) {
    return handleApiError(error);
  }
}
