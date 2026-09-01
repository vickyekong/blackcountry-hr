import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, requireStaffEmployee } from "@/lib/api-auth";
import { serializeBigInts } from "@/lib/payroll/config-mapper";

export async function GET() {
  try {
    const session = await requireStaffEmployee();

    const payslips = await prisma.payslip.findMany({
      where: {
        employeeId: session.employeeId,
        payrollRun: {
          companyId: session.user.companyId,
          status: { in: ["APPROVED", "PAID"] },
        },
      },
      include: {
        payrollRun: {
          select: {
            id: true,
            periodMonth: true,
            periodYear: true,
            status: true,
          },
        },
      },
      orderBy: { generatedAt: "desc" },
      take: 24,
    });

    return NextResponse.json(serializeBigInts(payslips));
  } catch (error) {
    return handleApiError(error);
  }
}
