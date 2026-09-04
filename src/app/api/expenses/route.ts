import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requireAuth, AuthError } from "@/lib/api-auth";
import { nairaToKobo } from "@/lib/money";
import { serializeBigInts } from "@/lib/payroll/config-mapper";
import { notifyEmployeeUser, notifyUsersInRoles } from "@/lib/notifications";
import { displayName } from "@/lib/employees/data-quality";
import {
  EXPENSE_CATEGORIES,
  approvalHint,
} from "@/lib/expenses/policy";
import { parseReceiptDataUrl } from "@/lib/expenses/receipt";
import {
  canCreateExpenseForStaff,
  canListCompanyExpenses,
} from "@/lib/expenses/access";

const staffSelect = {
  id: true,
  firstName: true,
  lastName: true,
  employeeCode: true,
  managerId: true,
} as const;

const claimInclude = {
  employee: { select: staffSelect },
  approvedBy: { select: { name: true } },
  reimbursedBy: { select: { name: true } },
} as const;

const createSchema = z.object({
  employeeId: z.string().min(1),
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
    const session = await requireAuth();
    const where: {
      companyId: string;
      employee?: { managerId: string };
    } = { companyId: session.user.companyId };

    if (canListCompanyExpenses(session.user.role)) {
      // full company list
    } else if (session.user.employeeId) {
      where.employee = { managerId: session.user.employeeId };
    } else {
      return NextResponse.json([]);
    }

    const rows = await prisma.expenseClaim.findMany({
      where,
      include: claimInclude,
      orderBy: { createdAt: "desc" },
      take: 200,
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
    const session = await requireAuth();
    if (!canCreateExpenseForStaff(session.user.role)) {
      throw new AuthError("Forbidden", 403);
    }
    const body = createSchema.parse(await req.json());
    const employee = await prisma.employee.findFirst({
      where: { id: body.employeeId, companyId: session.user.companyId },
      select: staffSelect,
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
      include: claimInclude,
    });
    await notifyUsersInRoles({
      companyId: session.user.companyId,
      roles: ["HR_ADMIN", "SUPER_ADMIN"],
      type: "EXPENSE_CLAIM",
      title: "Expense claim recorded",
      body: `${displayName(employee.firstName, employee.lastName, employee.employeeCode)} — ₦${body.amountNaira.toLocaleString("en-NG")}.`,
      linkUrl: "/expenses",
      entityType: "ExpenseClaim",
      entityId: row.id,
      excludeUserId: session.user.id,
    });
    if (employee.managerId) {
      await notifyEmployeeUser({
        companyId: session.user.companyId,
        employeeId: employee.managerId,
        type: "EXPENSE_CLAIM",
        title: "Expense claim from your report",
        body: `${displayName(employee.firstName, employee.lastName, employee.employeeCode)} submitted ₦${body.amountNaira.toLocaleString("en-NG")}.`,
        linkUrl: "/expenses",
        entityType: "ExpenseClaim",
        entityId: row.id,
      });
    }
    return NextResponse.json(
      serializeBigInts({ ...withoutReceipt(row), hasReceipt: Boolean(row.receiptUrl) }),
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
