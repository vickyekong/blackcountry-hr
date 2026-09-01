import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requirePermission, handleApiError } from "@/lib/api-auth";
import { can } from "@/lib/permissions";
import {
  reverseAndRegeneratePayrollRun,
  snapshotStatutoryConfigForRun,
  PayrollRunError,
} from "@/lib/payroll/run-service";
import { serializeBigInts } from "@/lib/payroll/config-mapper";
import {
  notifyPayrollSubmitted,
  notifyPayrollForwardedToFinance,
  notifyPayrollProcessingComplete,
} from "@/lib/notifications";
import { getPayrollPreflight } from "@/lib/payroll/preflight";
import { approvedTimesheetHoursForPeriod } from "@/lib/timesheets/period";
import { findAccessiblePayrollRun } from "@/lib/tenancy/workspace";
import { z } from "zod";

const actionSchema = z.object({
  action: z.enum([
    "submit_review",
    "approve",
    "reject",
    "forward_finance",
    "start_processing",
    "complete_processing",
    "reverse",
  ]),
  reason: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const access = await findAccessiblePayrollRun(session.user, params.id);
    if (!access) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const run = await prisma.payrollRun.findFirst({
      where: { id: access.id },
      include: {
        payslips: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true,
                department: true,
                employmentType: true,
              },
            },
          },
        },
        createdBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
        adjustments: {
          include: {
            employee: {
              select: {
                firstName: true,
                lastName: true,
                employeeCode: true,
              },
            },
          },
        },
      },
    });

    if (!run) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (session.user.role === "EMPLOYEE" && session.user.employeeId) {
      run.payslips = run.payslips.filter(
        (p) => p.employeeId === session.user.employeeId
      );
    } else if (
      !can(session.user.role, "runPayroll") &&
      !can(session.user.role, "approvePayroll") &&
      !can(session.user.role, "processPayrollFinance")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const timesheetHours = await approvedTimesheetHoursForPeriod(
      access.companyId,
      run.periodYear,
      run.periodMonth
    );

    return NextResponse.json(serializeBigInts({ ...run, timesheetHours }));
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
    const body = actionSchema.parse(await req.json());

    const run = await findAccessiblePayrollRun(session.user, params.id);
    if (!run) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const operatingCompanyId = run.companyId;

    if (run.status === "PAID" && body.action !== "reverse") {
      return NextResponse.json(
        {
          error:
            "Paid payroll runs are immutable. Use reverse and re-run.",
        },
        { status: 400 }
      );
    }

    if (body.action === "reverse") {
      if (!can(session.user.role, "approvePayroll")) {
        return NextResponse.json(
          {
            error:
              "Only Super Admin can reverse an approved or paid payroll run.",
          },
          { status: 403 }
        );
      }

      const result = await reverseAndRegeneratePayrollRun(
        run.id,
        operatingCompanyId
      );

      await prisma.auditLog.create({
        data: {
          companyId: operatingCompanyId,
          action: "REVERSE",
          entityType: "PayrollRun",
          entityId: run.id,
          performedById: session.user.id,
          changes: {
            action: body.action,
            reason: body.reason,
            from: run.status,
            to: "DRAFT",
            employeeCount: result.employeeCount,
          },
        },
      });

      const updated = await prisma.payrollRun.findUnique({
        where: { id: run.id },
      });
      return NextResponse.json(serializeBigInts(updated));
    }

    let update: {
      status?:
        | "DRAFT"
        | "UNDER_REVIEW"
        | "APPROVED"
        | "FORWARDED_TO_FINANCE"
        | "PROCESSING"
        | "PAID";
      approvedById?: string | null;
      approvedAt?: Date | null;
      paidAt?: Date | null;
      forwardedAt?: Date | null;
      processedAt?: Date | null;
    } = {};
    let notificationResult: Awaited<
      ReturnType<typeof notifyPayrollSubmitted>
    > | null = null;
    let forwardedCount: number | null = null;
    let processedCount: number | null = null;

    switch (body.action) {
      case "submit_review":
        if (!can(session.user.role, "runPayroll")) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        if (run.status !== "DRAFT") {
          return NextResponse.json(
            { error: "Can only submit draft runs" },
            { status: 400 }
          );
        }
        if (
          (await prisma.payslip.count({ where: { payrollRunId: run.id } })) ===
          0
        ) {
          return NextResponse.json(
            { error: "Cannot submit an empty payroll run. Recalculate first." },
            { status: 400 }
          );
        }
        const preflight = await getPayrollPreflight(
          operatingCompanyId,
          run.id
        );
        if (!preflight.canSubmit) {
          return NextResponse.json(
            {
              error:
                "Pre-flight blocked submit. Fix blockers before sending to Super Admin for approval.",
              preflight,
            },
            { status: 422 }
          );
        }
        update = { status: "UNDER_REVIEW" };
        notificationResult = await notifyPayrollSubmitted({
          companyId: operatingCompanyId,
          runId: run.id,
          periodMonth: run.periodMonth,
          periodYear: run.periodYear,
          submittedByName: session.user.name,
          excludeUserId: session.user.id,
        });
        break;

      case "approve":
        await requirePermission("approvePayroll");
        if (run.status !== "UNDER_REVIEW") {
          return NextResponse.json(
            { error: "Can only approve runs under review" },
            { status: 400 }
          );
        }
        // Freeze statutory rules used for this approved historical payroll
        await snapshotStatutoryConfigForRun(run.id, operatingCompanyId);
        update = {
          status: "APPROVED",
          approvedById: session.user.id,
          approvedAt: new Date(),
        };
        break;

      case "reject":
        await requirePermission("approvePayroll");
        if (run.status !== "UNDER_REVIEW") {
          return NextResponse.json(
            { error: "Can only reject runs under review" },
            { status: 400 }
          );
        }
        update = {
          status: "DRAFT",
          approvedById: null,
          approvedAt: null,
          ...(body.reason?.trim()
            ? { notes: `Sent back by Super Admin: ${body.reason.trim()}` }
            : {}),
        };
        break;

      case "forward_finance":
        if (!can(session.user.role, "forwardPayrollToFinance")) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        if (run.status !== "APPROVED") {
          return NextResponse.json(
            { error: "Can only forward approved payroll to Finance" },
            { status: 400 }
          );
        }
        update = {
          status: "FORWARDED_TO_FINANCE",
          forwardedAt: new Date(),
        };
        forwardedCount = await notifyPayrollForwardedToFinance({
          companyId: operatingCompanyId,
          runId: run.id,
          periodMonth: run.periodMonth,
          periodYear: run.periodYear,
          forwardedByName: session.user.name,
          excludeUserId: session.user.id,
        });
        break;

      case "start_processing":
        await requirePermission("processPayrollFinance");
        if (run.status !== "FORWARDED_TO_FINANCE") {
          return NextResponse.json(
            { error: "Can only start processing after HR forwards the run" },
            { status: 400 }
          );
        }
        update = { status: "PROCESSING" };
        break;

      case "complete_processing":
        await requirePermission("processPayrollFinance");
        if (run.status !== "PROCESSING") {
          return NextResponse.json(
            { error: "Can only complete a run that Finance has started" },
            { status: 400 }
          );
        }
        update = {
          status: "PAID",
          paidAt: new Date(),
          processedAt: new Date(),
        };
        processedCount = await notifyPayrollProcessingComplete({
          companyId: operatingCompanyId,
          runId: run.id,
          periodMonth: run.periodMonth,
          periodYear: run.periodYear,
          processedByName: session.user.name,
          excludeUserId: session.user.id,
        });
        break;
    }

    const updated = await prisma.payrollRun.update({
      where: { id: run.id },
      data: update,
    });

    if (body.action === "approve" || body.action === "reject") {
      await prisma.notification.updateMany({
        where: {
          entityType: "PayrollRun",
          entityId: run.id,
          type: "PAYROLL_REVIEW",
          readAt: null,
        },
        data: { readAt: new Date() },
      });
    }

    await prisma.auditLog.create({
      data: {
        companyId: operatingCompanyId,
        action: body.action.toUpperCase(),
        entityType: "PayrollRun",
        entityId: run.id,
        performedById: session.user.id,
        changes: {
          action: body.action,
          reason: body.reason,
          from: run.status,
          to: update.status,
          notified: notificationResult?.recipients.map((r) => ({
            email: r.email,
            role: r.role,
            notificationId: r.notificationId,
          })),
          reviewUrl: notificationResult?.linkUrl,
          financeNotified: forwardedCount,
          hrNotified: processedCount,
        },
      },
    });

    return NextResponse.json(
      serializeBigInts({
        ...updated,
        notification: notificationResult
          ? {
              reviewUrl: notificationResult.linkUrl,
              periodLabel: notificationResult.periodLabel,
              recipients: notificationResult.recipients.map((r) => ({
                name: r.name,
                email: r.email,
                role: r.role,
              })),
            }
          : null,
      })
    );
  } catch (error) {
    if (error instanceof PayrollRunError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return handleApiError(error);
  }
}
