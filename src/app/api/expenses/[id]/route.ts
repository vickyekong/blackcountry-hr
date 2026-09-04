import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AuthError, handleApiError, requireAuth } from "@/lib/api-auth";
import { nairaToKobo } from "@/lib/money";
import { serializeBigInts } from "@/lib/payroll/config-mapper";
import { notifyEmployeeUser, notifyUsersInRoles } from "@/lib/notifications";
import { emitPlatformEvent } from "@/lib/integrations/dispatch";
import { displayName } from "@/lib/employees/data-quality";
import { REIMBURSEMENT_METHODS } from "@/lib/expenses/policy";
import { approverMayAct, canListCompanyExpenses, canReimburseClaim } from "@/lib/expenses/access";

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    approvedNaira: z.number().positive().optional(),
    reviewNote: z.string().trim().max(500).optional(),
  }),
  z.object({
    action: z.literal("reject"),
    reviewNote: z.string().trim().max(500).optional(),
  }),
  z.object({
    action: z.literal("reimburse"),
    method: z.enum(REIMBURSEMENT_METHODS),
    reference: z.string().trim().max(120).optional(),
  }),
]);

const staffSelect = {
  id: true,
  firstName: true,
  lastName: true,
  employeeCode: true,
  managerId: true,
} as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const row = await prisma.expenseClaim.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
      include: {
        employee: { select: staffSelect },
        approvedBy: { select: { name: true } },
        reimbursedBy: { select: { name: true } },
      },
    });
    if (!row) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }
    const isOwn = session.user.employeeId === row.employeeId;
    const isManager =
      Boolean(session.user.employeeId) &&
      row.employee.managerId === session.user.employeeId;
    if (!isOwn && !isManager && !canListCompanyExpenses(session.user.role)) {
      throw new AuthError("Forbidden", 403);
    }
    return NextResponse.json(
      serializeBigInts({ ...row, hasReceipt: Boolean(row.receiptUrl) })
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const existing = await prisma.expenseClaim.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
      include: { employee: { select: staffSelect } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }
    const body = patchSchema.parse(await req.json());
    const staffName = displayName(
      existing.employee.firstName,
      existing.employee.lastName,
      existing.employee.employeeCode
    );

    if (body.action === "approve" || body.action === "reject") {
      if (existing.status !== "PENDING") {
        return NextResponse.json(
          { error: "Only pending claims can be approved or rejected" },
          { status: 400 }
        );
      }
      if (
        !approverMayAct({
          role: session.user.role,
          amountKobo: existing.amountKobo,
          reviewerEmployeeId: session.user.employeeId,
          claimantManagerId: existing.employee.managerId,
        })
      ) {
        throw new AuthError(
          "You cannot approve this amount — Super Admin clearance is required above ₦500,000",
          403
        );
      }
      if (body.action === "reject") {
        const updated = await prisma.expenseClaim.update({
          where: { id: existing.id },
          data: {
            status: "REJECTED",
            approvedById: session.user.id,
            approvedAt: new Date(),
            reviewNote: body.reviewNote,
            approvedAmountKobo: 0,
          },
        });
        await notifyEmployeeUser({
          companyId: session.user.companyId,
          employeeId: existing.employeeId,
          type: "EXPENSE_CLAIM",
          title: "Expense claim sent back",
          body: body.reviewNote
            ? `${staffName}: ${body.reviewNote}`
            : "Your expense claim was not approved.",
          linkUrl: "/staff/expenses",
          entityType: "ExpenseClaim",
          entityId: existing.id,
        });
        return NextResponse.json(serializeBigInts(updated));
      }
      const approvedKobo = body.approvedNaira
        ? nairaToKobo(body.approvedNaira)
        : existing.amountKobo;
      if (approvedKobo > existing.amountKobo) {
        return NextResponse.json(
          { error: "Approved amount cannot exceed the claim" },
          { status: 400 }
        );
      }
      const updated = await prisma.expenseClaim.update({
        where: { id: existing.id },
        data: {
          status: "APPROVED",
          approvedAmountKobo: approvedKobo,
          approvedById: session.user.id,
          approvedAt: new Date(),
          reviewNote: body.reviewNote,
        },
      });
      await notifyEmployeeUser({
        companyId: session.user.companyId,
        employeeId: existing.employeeId,
        type: "EXPENSE_CLAIM",
        title: "Expense claim approved",
        body: "Finance will reimburse the approved amount.",
        linkUrl: "/staff/expenses",
        entityType: "ExpenseClaim",
        entityId: existing.id,
      });
      await notifyUsersInRoles({
        companyId: session.user.companyId,
        roles: ["FINANCE", "HR_ADMIN", "SUPER_ADMIN"],
        type: "EXPENSE_CLAIM",
        title: "Expense ready to reimburse",
        body: `${staffName} — approved claim awaiting payment.`,
        linkUrl:
        linkUrl: "/finance/expenses",
        entityType: "ExpenseClaim",
        entityId: existing.id,
        excludeUserId: session.user.id,
      });
      emitPlatformEvent({
        companyId: session.user.companyId,
        event: "expense.approved",
        entityType: "ExpenseClaim",
        entityId: existing.id,
        data: { employeeCode: existing.employee.employeeCode },
      });
      return NextResponse.json(serializeBigInts(updated));
    }

    if (!canReimburseClaim(session.user.role)) {
      throw new AuthError("Forbidden", 403);
    }
    if (existing.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Only approved claims can be reimbursed" },
        { status: 400 }
      );
    }
    if (existing.payrollRunId && body.method !== "PAYROLL") {
      return NextResponse.json(
        { error: "This claim is already queued on a payroll run" },
        { status: 400 }
      );
    }

    const payrollQueued = body.method === "PAYROLL";
    const updated = await prisma.expenseClaim.update({
      where: { id: existing.id },
      data: {
        reimbursementMethod: body.method,
        reimbursementRef: body.reference,
        reimbursedById: session.user.id,
        ...(payrollQueued
          ? {}
          : {
              status: "REIMBURSED",
              reimbursedAt: new Date(),
            }),
      },
    });
    await notifyEmployeeUser({
      companyId: session.user.companyId,
      employeeId: existing.employeeId,
      type: "EXPENSE_CLAIM",
      title: payrollQueued
        ? "Expense queued on next payroll"
        : "Expense reimbursed",
      body: payrollQueued
        ? "The approved amount will be added as a non-taxable reimbursement on the next draft payroll."
        : "Your approved expense has been paid.",
      linkUrl: "/staff/expenses",
      entityType: "ExpenseClaim",
      entityId: existing.id,
    });
    return NextResponse.json(serializeBigInts(updated));
  } catch (error) {
    return handleApiError(error);
  }
}
