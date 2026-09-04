import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  AuthError,
  handleApiError,
  requireAuth,
} from "@/lib/api-auth";
import { can } from "@/lib/permissions";
import { serializeBigInts } from "@/lib/payroll/config-mapper";
import { REMITTANCE_KINDS } from "@/lib/payroll/labels";
import { syncRemittanceRows } from "@/lib/payroll/remittance-sync";
import { findAccessiblePayrollRun } from "@/lib/tenancy/workspace";

const patchSchema = z.object({
  kind: z.enum(REMITTANCE_KINDS),
  action: z.enum(["paid", "pending"]),
  reference: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    if (
      !can(session.user.role, "runPayroll") &&
      !can(session.user.role, "processPayrollFinance")
    ) {
      throw new AuthError("Forbidden", 403);
    }

    const run = await findAccessiblePayrollRun(session.user, params.id);
    if (!run) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await syncRemittanceRows({
      companyId: run.companyId,
      payrollRunId: run.id,
    });

    const body = patchSchema.parse(await req.json());
    const existing = await prisma.remittancePayment.findUnique({
      where: {
        payrollRunId_kind: { payrollRunId: run.id, kind: body.kind },
      },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Remittance line not ready until payroll is approved" },
        { status: 400 }
      );
    }

    const updated = await prisma.remittancePayment.update({
      where: { id: existing.id },
      data:
        body.action === "paid"
          ? {
              status: "PAID",
              paidAt: new Date(),
              reference: body.reference,
              notes: body.notes,
            }
          : {
              status: "PENDING",
              paidAt: null,
              reference: body.reference,
              notes: body.notes,
            },
    });
    return NextResponse.json(serializeBigInts(updated));
  } catch (error) {
    return handleApiError(error);
  }
}
