import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requirePermission, handleApiError } from "@/lib/api-auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";

const patchSchema = z.object({
  visibility: z.enum(["EDITORS", "ALL_FULL_TIME", "SPECIFIC"]).optional(),
  employeeIds: z.array(z.string()).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("editWorkspaceFiles");
    const body = patchSchema.parse(await req.json());
    const file = await prisma.workspaceFile.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    });
    if (!file) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const visibility = body.visibility ?? file.visibility;
    const employeeIds = body.employeeIds;
    if (visibility === "SPECIFIC" && employeeIds && employeeIds.length === 0) {
      return NextResponse.json(
        { error: "Pick at least one person who can view this file" },
        { status: 400 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.workspaceFile.update({
        where: { id: file.id },
        data: { visibility },
      });
      if (employeeIds) {
        await tx.workspaceFileGrant.deleteMany({ where: { fileId: file.id } });
        if (visibility === "SPECIFIC" && employeeIds.length > 0) {
          await tx.workspaceFileGrant.createMany({
            data: employeeIds.map((employeeId) => ({
              fileId: file.id,
              employeeId,
            })),
          });
        }
      } else if (visibility !== "SPECIFIC") {
        await tx.workspaceFileGrant.deleteMany({ where: { fileId: file.id } });
      }
      return tx.workspaceFile.findUniqueOrThrow({
        where: { id: next.id },
        include: {
          grants: {
            select: {
              employeeId: true,
              employee: { select: { firstName: true, lastName: true } },
            },
          },
        },
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

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
