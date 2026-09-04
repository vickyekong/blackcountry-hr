import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requirePermission } from "@/lib/api-auth";
import { mapStatutoryConfig } from "@/lib/payroll/config-mapper";
import { serializeBigInts } from "@/lib/payroll/config-mapper";
import { simulatePayrollImpact } from "@/lib/payroll/simulate";

const simulateSchema = z.object({
  salaryIncreaseBps: z.number().int().min(0).max(10000).optional(),
  transportIncreaseNaira: z.number().min(0).optional(),
  extraHires: z.number().int().min(0).max(200).optional(),
  extraHireMonthlyGrossNaira: z.number().min(0).optional(),
  overtimeIncreaseBps: z.number().int().min(0).max(10000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("runPayroll");
    const body = simulateSchema.parse(await req.json());
    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      include: { statutoryConfig: true, taxBands: true },
    });
    const config = mapStatutoryConfig(
      company?.statutoryConfig ?? null,
      company?.taxBands
    );
    const now = new Date();
    const employees = await prisma.employee.findMany({
      where: { companyId: session.user.companyId, status: "ACTIVE" },
      select: {
        basicSalaryKobo: true,
        housingAllowanceKobo: true,
        transportAllowanceKobo: true,
        otherTaxableAllowancesKobo: true,
        nonTaxableReimbursementsKobo: true,
        annualRentKobo: true,
      },
    });
    const result = simulatePayrollImpact(
      employees,
      config,
      { month: now.getMonth() + 1, year: now.getFullYear() },
      body
    );
    return NextResponse.json(serializeBigInts(result));
  } catch (error) {
    return handleApiError(error);
  }
}
