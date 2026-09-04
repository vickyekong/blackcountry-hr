import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requireStaffEmployee } from "@/lib/api-auth";
import { nairaToKobo } from "@/lib/money";
import { serializeBigInts } from "@/lib/payroll/config-mapper";
import { notifyEmployeeUser, notifyUsersInRoles } from "@/lib/notifications";
import { displayName } from "@/lib/employees/data-quality";
import { EXPENSE_CATEGORIES, approvalHint } from "@/lib/expenses/policy";
import { parseReceiptDataUrl } from "@/lib/expenses/receipt";

const createSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES).default("OTHER"),
  amountNaira: z.number().positive(),
  description: z.string().trim().min(1).max(1000),
  incurredOn: z.string().min(1),
  receiptUrl: z.string().optional(),
});

function withoutReceipt<T extends { receiptUrl?: string | null }>(row: T) {
  const { receiptUrl, ...rest } = row;
  return { ...rest, hasReceipt: Boolean(receiptUrl) };
}

export async function GET() {
  try {
    const session = await requireStaffEmployee();
    const rows = await prisma.expenseClaim.findMany({
      where: { employeeId: session.employeeId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(
      serializeBigInts(
        rows.map((row) => ({
          ...withoutReceipt(row),
          approvalHint: approvalHint(row.amountKobo),
        }))
      )
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireStaffEmployee();
    const body = createSchema.parse(await req.json());
    const employee = await prisma.employee.findFirst({
      where: { id: session.employeeId, companyId: session.user.companyId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeCode: true,
        managerId: true,
      },
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    const incurredOn = new Date(body.incurredOn);
    if (Number.isNaN(incurredOn.getTime())) {
      return NextResponse.json({ error: "Invalid date incurred" }, { status: 400 });
    }
    const row = await prisma.expenseClaim.create({
      data: {
        companyId: session.user.companyId,
        employeeId: employee.id,
        category: body.category,
        amountKobo: nairaToKobo(body.amountNaira),
        description: body.description,
        incurredOn,
        receiptUrl: parseReceiptDataUrl(body.receiptUrl),
        status: "PENDING",
      },
    });
    const name = displayName(
      employee.firstName,
      employee.lastName,
      employee.employeeCode
    );
    await notifyUsersInRoles({
      companyId: session.user.companyId,
      roles: ["HR_ADMIN", "SUPER_ADMIN"],
      type: "EXPENSE_CLAIM",
      title: "Expense claim from staff",
      body: `${name} submitted ₦${body.amountNaira.toLocaleString("en-NG")}.`,
      linkUrl: "/expenses",
      entityType: "ExpenseClaim",
      entityId: row.id,
    });
    if (employee.managerId) {
      await notifyEmployeeUser({
        companyId: session.user.companyId,
        employeeId: employee.managerId,
        type: "EXPENSE_CLAIM",
        title: "Expense claim from your report",
        body: `${name} submitted ₦${body.amountNaira.toLocaleString("en-NG")}.`,
        linkUrl: "/expenses",
        entityType: "ExpenseClaim",
        entityId: row.id,
      });
    }
    return NextResponse.json(
      serializeBigInts(withoutReceipt(row)),
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
