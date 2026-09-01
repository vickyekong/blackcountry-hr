import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import {
  createSubsidiary,
  TenancyError,
} from "@/lib/tenancy/bootstrap-company";

const createSchema = z.object({
  name: z.string().trim().min(2).max(160),
  address: z.string().trim().max(300).optional().nullable(),
});

/** Super Admin of the group company registers a sub-company. */
export async function GET() {
  try {
    const session = await requirePermission("manageGroupCompanies");
    const home = await prisma.company.findUnique({
      where: { id: session.user.homeCompanyId },
      select: {
        id: true,
        name: true,
        parentId: true,
        subsidiaries: {
          select: { id: true, name: true, address: true, createdAt: true },
          orderBy: { name: "asc" },
        },
      },
    });
    if (!home || home.parentId) {
      return NextResponse.json({
        isGroup: false,
        subsidiaries: [] as Array<{ id: string; name: string }>,
      });
    }
    return NextResponse.json({
      isGroup: true,
      group: { id: home.id, name: home.name },
      subsidiaries: home.subsidiaries,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("manageGroupCompanies");
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = createSchema.parse(await req.json());
    const company = await createSubsidiary({
      parentCompanyId: session.user.homeCompanyId,
      name: body.name,
      address: body.address,
    });

    await prisma.auditLog.create({
      data: {
        companyId: session.user.homeCompanyId,
        action: "CREATE_SUBSIDIARY",
        entityType: "Company",
        entityId: company.id,
        performedById: session.user.id,
        changes: { name: company.name },
      },
    });

    return NextResponse.json({ company }, { status: 201 });
  } catch (error) {
    if (error instanceof TenancyError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    return handleApiError(error);
  }
}
