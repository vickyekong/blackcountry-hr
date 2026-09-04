import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requirePermission } from "@/lib/api-auth";
import { nairaToKobo } from "@/lib/money";
import { serializeBigInts } from "@/lib/payroll/config-mapper";
import { DEDUCTION_KINDS } from "@/lib/payroll/labels";

const staffSelect = {
  id: true,
  firstName: true,
  lastName: true,
  employeeCode: true,
} as const;

const createSchema = z.object({
  employeeId: z.string().min(1),
  kind: z.enum(DEDUCTION_KINDS).default("OTHER"),
  amountNaira: z.number().positive(),
  description: z.string().trim().max(500).optional(),
});

export async function GET() {
  try {
    const session = await requirePermission("manageCompensation");
    const rows = await prisma.recurringDeduction.findMany({
      where: { companyId: session.user.companyId },
      include: { employee: { select: staffSelect } },
      orderBy: { createdAt: "desc" },
      take: 300,
    });
    return NextResponse.json(serializeBigInts(rows));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("manageCompensation");
    const body = createSchema.parse(await req.json());
    const employee = await prisma.employee.findFirst({
      where: { id: body.employeeId, companyId: session.user.companyId },
      select: { id: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    const row = await prisma.recurringDeduction.create({
      data: {
        companyId: session.user.companyId,
        employeeId: employee.id,
        kind: body.kind,
        amountKobo: nairaToKobo(body.amountNaira),
        description: body.description,
        status: "ACTIVE",
      },
    });
    return NextResponse.json(serializeBigInts(row), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
