import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission, handleApiError } from "@/lib/api-auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("editWorkspaceFiles");
    const file = await prisma.workspaceFile.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    });
    if (!file) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.workspaceFile.delete({ where: { id: file.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    if (!can(session.user.role, "viewWorkspaceFiles")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const file = await prisma.workspaceFile.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
      include: { grants: { select: { employeeId: true } } },
    });
    if (!file) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const editor = can(session.user.role, "editWorkspaceFiles");
    if (!editor) {
      const allowed =
        file.visibility === "ALL_FULL_TIME" ||
        (file.visibility === "SPECIFIC" &&
          session.user.employeeId &&
          file.grants.some((g) => g.employeeId === session.user.employeeId));
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    return NextResponse.json(file);
  } catch (error) {
    return handleApiError(error);
  }
}
