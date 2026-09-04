import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requirePermission } from "@/lib/api-auth";
import { nairaToKobo } from "@/lib/money";
import { serializeBigInts } from "@/lib/payroll/config-mapper";
import { BENEFIT_KINDS } from "@/lib/payroll/labels";

const planSchema = z.object({
  name: z.string().trim().min(1).max(120),
  kind: z.enum(BENEFIT_KINDS).default("OTHER"),
  employerCostNaira: z.number().min(0).default(0),
  employeeDeductionNaira: z.number().min(0).default(0),
  notes: z.string().trim().max(500).optional(),
});

export async function GET() {
  try {
    const session = await requirePermission("manageCompensation");
    const rows = await prisma.benefitPlan.findMany({
      where: { companyId: session.user.companyId },
      include: {
        _count: { select: { enrollments: true } },
        enrollments: {
          where: { status: "ACTIVE" },
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(serializeBigInts(rows));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("manageCompensation");
    const body = planSchema.parse(await req.json());
    const row = await prisma.benefitPlan.create({
      data: {
        companyId: session.user.companyId,
        name: body.name,
        kind: body.kind,
        employerCostKobo: nairaToKobo(body.employerCostNaira),
        employeeDeductionKobo: nairaToKobo(body.employeeDeductionNaira),
        notes: body.notes,
      },
    });
    return NextResponse.json(serializeBigInts(row), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
