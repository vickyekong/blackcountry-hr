import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, handleApiError, AuthError } from "@/lib/api-auth";
import { can } from "@/lib/permissions";
import {
  recalculatePayrollRun,
  PayrollRunError,
} from "@/lib/payroll/run-service";
import { findAccessiblePayrollRun } from "@/lib/tenancy/workspace";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; adjustmentId: string } }
) {
  try {
    const session = await requireAuth();
    if (!can(session.user.role, "runPayroll")) {
      throw new AuthError("Forbidden", 403);
    }

    const run = await findAccessiblePayrollRun(session.user, params.id);
    if (!run) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const adjustment = await prisma.payrollAdjustment.findFirst({
      where: {
        id: params.adjustmentId,
        payrollRunId: run.id,
      },
    });

    if (!adjustment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const payrollRun = await prisma.payrollRun.findUnique({
      where: { id: run.id },
    });
    if (payrollRun?.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Can only delete adjustments on draft runs" },
        { status: 400 }
      );
    }

    await prisma.payrollAdjustment.delete({ where: { id: adjustment.id } });

    await recalculatePayrollRun(run.id, run.companyId, {
      employeeId: adjustment.employeeId,
    });

    await prisma.auditLog.create({
      data: {
        companyId: run.companyId,
        action: "DELETE_ADJUSTMENT",
        entityType: "PayrollAdjustment",
        entityId: adjustment.id,
        performedById: session.user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof PayrollRunError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return handleApiError(error);
  }
}
