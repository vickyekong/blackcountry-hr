import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import {
  recalculatePayrollRun,
  PayrollRunError,
} from "@/lib/payroll/run-service";
import { syncAttendanceIntoPayroll } from "@/lib/attendance/service";
import { findAccessiblePayrollRun } from "@/lib/tenancy/workspace";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  /** Re-compile clock attendance and refresh missed-shift deductions (default false — HR must opt in). */
  syncAttendance: z.boolean().optional().default(false),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("runPayroll");
    const run = await findAccessiblePayrollRun(session.user, params.id);
    if (!run) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const operatingCompanyId = run.companyId;
    let syncAttendance = false;
    try {
      const json = await req.json();
      syncAttendance = bodySchema.parse(json ?? {}).syncAttendance ?? false;
    } catch {
      // empty body is fine — default sync off
    }

    let attendance: Awaited<ReturnType<typeof syncAttendanceIntoPayroll>> | null =
      null;
    if (syncAttendance) {
      try {
        attendance = await syncAttendanceIntoPayroll({
          companyId: operatingCompanyId,
          payrollRunId: params.id,
        });
      } catch (err) {
        console.error("Attendance sync during recalculate skipped:", err);
      }
    }

    const result = await recalculatePayrollRun(params.id, operatingCompanyId);

    await prisma.auditLog.create({
      data: {
        companyId: operatingCompanyId,
        action: "RECALCULATE",
        entityType: "PayrollRun",
        entityId: params.id,
        performedById: session.user.id,
        changes: {
          employeeCount: result.employeeCount,
          syncAttendance,
          employeesPenalized: attendance?.penalties.employeesPenalized ?? 0,
          missedShiftDays: attendance?.penalties.missedShiftDays ?? 0,
          penaltyTotalKobo: attendance?.penalties.penaltyTotalKobo ?? "0",
        },
      },
    });

    return NextResponse.json({
      ...result,
      attendance: attendance
        ? {
            daysCompiled: attendance.compiled.daysCompiled,
            absentCount: attendance.compiled.absentCount,
            employeesPenalized: attendance.penalties.employeesPenalized,
            missedShiftDays: attendance.penalties.missedShiftDays,
            penaltyTotalKobo: attendance.penalties.penaltyTotalKobo,
          }
        : null,
    });
  } catch (error) {
    if (error instanceof PayrollRunError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return handleApiError(error);
  }
}
