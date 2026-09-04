import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requirePermission } from "@/lib/api-auth";
import { nairaToKobo } from "@/lib/money";
import { serializeBigInts } from "@/lib/payroll/config-mapper";
import {
  loanRepaymentTotalKobo,
  remainingKobo,
} from "@/lib/payroll/money-math";

const staffSelect = {
  id: true,
  firstName: true,
  lastName: true,
  employeeCode: true,
} as const;

const createSchema = z.object({
  employeeId: z.string().min(1),
  principalNaira: z.number().positive(),
  interestNaira: z.number().min(0).default(0),
  installments: z.number().int().min(1).max(36).default(1),
  reason: z.string().trim().max(500).optional(),
});

export async function GET() {
  try {
    const session = await requirePermission("manageCompensation");
    const rows = await prisma.salaryLoan.findMany({
      where: { companyId: session.user.companyId },
      include: {
        employee: { select: staffSelect },
        approvedBy: { select: { name: true } },
        charges: { include: { payrollRun: { select: { status: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json(
      serializeBigInts(
        rows.map((row) => {
          const total = loanRepaymentTotalKobo(
            row.principalKobo,
            row.interestKobo
          );
          return {
            ...row,
            repaymentKobo: total,
            remainingKobo: remainingKobo(
              total,
              row.charges.map((c) => ({
                amountKobo: c.amountKobo,
                runStatus: c.payrollRun.status,
              }))
            ),
          };
        })
      )
    );
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
    const row = await prisma.salaryLoan.create({
      data: {
        companyId: session.user.companyId,
        employeeId: employee.id,
        principalKobo: nairaToKobo(body.principalNaira),
        interestKobo: nairaToKobo(body.interestNaira),
        installments: body.installments,
        reason: body.reason,
        status: "PENDING",
      },
    });
    return NextResponse.json(serializeBigInts(row), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
