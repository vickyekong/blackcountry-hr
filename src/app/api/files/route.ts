import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requirePermission, handleApiError } from "@/lib/api-auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";

const createSchema = z.object({
  name: z.string().trim().min(1).max(180),
  fileUrl: z.string().trim().min(8).max(4000),
  folder: z.string().trim().max(80).optional(),
  visibility: z.enum(["EDITORS", "ALL_FULL_TIME", "SPECIFIC"]).default("EDITORS"),
  employeeIds: z.array(z.string()).optional(),
});

export async function GET() {
  try {
    const session = await requireAuth();
    if (!can(session.user.role, "viewWorkspaceFiles")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const editor = can(session.user.role, "editWorkspaceFiles");
    const files = await prisma.workspaceFile.findMany({
      where: { companyId: session.user.companyId },
      include: {
        grants: { select: { employeeId: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (editor) {
      return NextResponse.json(files);
    }

    const employeeId = session.user.employeeId;
    const visible = files.filter((file) => {
      if (file.visibility === "ALL_FULL_TIME") return true;
      if (file.visibility === "SPECIFIC" && employeeId) {
        return file.grants.some((g) => g.employeeId === employeeId);
      }
      return false;
    });
    return NextResponse.json(visible);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("editWorkspaceFiles");
    const body = createSchema.parse(await req.json());
    if (
      !body.fileUrl.startsWith("https://") &&
      !body.fileUrl.startsWith("http://") &&
      !body.fileUrl.startsWith("data:")
    ) {
      return NextResponse.json(
        { error: "File must be an https link or an uploaded document" },
        { status: 400 }
      );
    }

    const file = await prisma.workspaceFile.create({
      data: {
        companyId: session.user.companyId,
        name: body.name,
        fileUrl: body.fileUrl,
        folder: body.folder?.trim() || "general",
        visibility: body.visibility,
        uploadedById: session.user.id,
        grants:
          body.visibility === "SPECIFIC" && body.employeeIds?.length
            ? {
                create: body.employeeIds.map((employeeId) => ({ employeeId })),
              }
            : undefined,
      },
      include: { grants: { select: { employeeId: true } } },
    });
    return NextResponse.json(file, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
