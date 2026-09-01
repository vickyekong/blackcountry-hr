import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import {
  createSubsidiary,
  TenancyError,
} from "@/lib/tenancy/bootstrap-company";
import { flattenCompanyTree } from "@/lib/tenancy/company-tree";

const createSchema = z.object({
  name: z.string().trim().min(2).max(160),
  address: z.string().trim().max(300).optional().nullable(),
  parentCompanyId: z.string().trim().min(1).optional(),
});

/** Super Admin of the group company registers a sub-company, including nested ones. */
export async function GET() {
  try {
    const session = await requirePermission("manageGroupCompanies");
    const all = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        parentId: true,
        address: true,
        createdAt: true,
      },
    });
    const home = all.find((c) => c.id === session.user.homeCompanyId);
    if (!home || home.parentId) {
      return NextResponse.json({
        isGroup: false,
        subsidiaries: [] as Array<{ id: string; name: string }>,
        companies: [] as Array<{
          id: string;
          name: string;
          parentId: string | null;
          depth: number;
        }>,
      });
    }
    const tree = flattenCompanyTree(home.id, all, home.id);
    const byId = new Map(all.map((c) => [c.id, c]));
    const companies = tree.map((c) => ({
      ...c,
      address: byId.get(c.id)?.address ?? null,
    }));
    return NextResponse.json({
      isGroup: true,
      group: { id: home.id, name: home.name },
      companies,
      subsidiaries: companies.filter((c) => c.id !== home.id),
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
    const parentCompanyId = body.parentCompanyId || session.user.homeCompanyId;

    const all = await prisma.company.findMany({
      select: { id: true, name: true, parentId: true },
    });
    const treeIds = new Set(
      flattenCompanyTree(
        session.user.homeCompanyId,
        all,
        session.user.homeCompanyId
      ).map((c) => c.id)
    );
    if (!treeIds.has(parentCompanyId)) {
      return NextResponse.json(
        { error: "Parent company is not in this group." },
        { status: 400 }
      );
    }

    const company = await createSubsidiary({
      parentCompanyId,
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
        changes: { name: company.name, parentCompanyId },
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
