import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requirePermission } from "@/lib/api-auth";
import { nairaToKobo } from "@/lib/money";
import { serializeBigInts } from "@/lib/payroll/config-mapper";
import { notifyUsersInRoles } from "@/lib/notifications";
import { displayName } from "@/lib/employees/data-quality";
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
  amountNaira: z.number().positive(),
  installments: z.number().int().min(1).max(24).default(1),
  reason: z.string().trim().max(500).optional(),
});

export async function GET() {
  try {
    const session = await requirePermission("manageCompensation");
    const rows = await prisma.salaryAdvance.findMany({
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
        rows.map((row) => ({
          ...row,
          remainingKobo: remainingKobo(
            row.approvedKobo > 0n ? row.approvedKobo : row.requestedKobo,
            row.charges.map((c) => ({
              amountKobo: c.amountKobo,
              runStatus: c.payrollRun.status,
            }))
          ),
        }))
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
      select: staffSelect,
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    const requestedKobo = nairaToKobo(body.amountNaira);
    const row = await prisma.salaryAdvance.create({
      data: {
        companyId: session.user.companyId,
        employeeId: employee.id,
        requestedKobo,
        approvedKobo: 0,
        installments: body.installments,
        reason: body.reason,
        status: "PENDING",
      },
    });
    await notifyUsersInRoles({
      companyId: session.user.companyId,
      roles: ["HR_ADMIN", "SUPER_ADMIN"],
      type: "SALARY_ADVANCE",
      title: "Salary advance recorded",
      body: `${displayName(employee.firstName, employee.lastName, employee.employeeCode)} — ₦${body.amountNaira.toLocaleString("en-NG")} over ${body.installments} month(s).`,
      linkUrl: "/payroll?tab=advances",
      entityType: "SalaryAdvance",
      entityId: row.id,
      excludeUserId: session.user.id,
    });
    return NextResponse.json(serializeBigInts(row), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
