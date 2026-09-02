import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { nairaToKobo } from "@/lib/money";
import { serializeBigInts } from "@/lib/payroll/config-mapper";
import { parseOptionalDate } from "@/lib/people/dates";
import { ASSET_TYPES } from "@/lib/people/labels";
import { z } from "zod";

const createSchema = z.object({
  assetCode: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(120),
  assetType: z.enum(ASSET_TYPES),
  serialNumber: z.string().trim().max(80).nullable().optional(),
  valueNaira: z.number().min(0).optional(),
  purchasedAt: z.string().nullable().optional(),
  notes: z.string().trim().max(400).nullable().optional(),
});

function serializeAsset(asset: {
  assignedEmployee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
  } | null;
  [key: string]: unknown;
}) {
  return serializeBigInts(asset);
}

export async function GET() {
  try {
    const session = await requirePermission("viewEmployees");
    const assets = await prisma.companyAsset.findMany({
      where: { companyId: session.user.companyId },
      orderBy: { assetCode: "asc" },
      include: {
        assignedEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
          },
        },
      },
    });
    return NextResponse.json(assets.map(serializeAsset));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("manageEmployees");
    const body = createSchema.parse(await req.json());
    const existing = await prisma.companyAsset.findUnique({
      where: {
        companyId_assetCode: {
          companyId: session.user.companyId,
          assetCode: body.assetCode,
        },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Asset code already exists" },
        { status: 409 }
      );
    }

    const asset = await prisma.companyAsset.create({
      data: {
        companyId: session.user.companyId,
        assetCode: body.assetCode,
        name: body.name,
        assetType: body.assetType,
        serialNumber: body.serialNumber?.trim() || null,
        valueKobo: nairaToKobo(body.valueNaira ?? 0),
        purchasedAt: parseOptionalDate(body.purchasedAt ?? undefined) ?? null,
        notes: body.notes?.trim() || null,
      },
      include: {
        assignedEmployee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        companyId: session.user.companyId,
        action: "CREATE",
        entityType: "CompanyAsset",
        entityId: asset.id,
        performedById: session.user.id,
        changes: { assetCode: asset.assetCode, name: asset.name },
      },
    });

    return NextResponse.json(serializeAsset(asset), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
