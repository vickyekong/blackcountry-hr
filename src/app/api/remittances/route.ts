import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, requirePermission } from "@/lib/api-auth";
import { serializeBigInts } from "@/lib/payroll/config-mapper";
import { getMonthName } from "@/lib/utils";
import { syncRemittanceRows } from "@/lib/payroll/remittance-sync";

export async function GET() {
  try {
    const session = await requirePermission("runPayroll");
    const runs = await prisma.payrollRun.findMany({
      where: {
        companyId: session.user.companyId,
        status: {
          in: ["APPROVED", "FORWARDED_TO_FINANCE", "PROCESSING", "PAID"],
        },
      },
      include: {
        remittancePayments: true,
        _count: { select: { payslips: true } },
      },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
      take: 24,
    });

    const payload = [];
    for (const run of runs) {
      const payments = await syncRemittanceRows({
        companyId: session.user.companyId,
        payrollRunId: run.id,
      });
      payload.push({
        id: run.id,
        periodLabel: `${getMonthName(run.periodMonth)} ${run.periodYear}`,
        status: run.status,
        payslipCount: run._count.payslips,
        payments,
      });
    }
    return NextResponse.json(serializeBigInts(payload));
  } catch (error) {
    return handleApiError(error);
  }
}
