import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requirePermission } from "@/lib/api-auth";
import { ensureAutomationSchema } from "@/lib/ensure-automation-schema";
import { parseAutomationSettings } from "@/lib/automation/playbooks";

const patchSchema = z.object({
  expiryLeadDays: z.number().int().min(1).max(365).optional(),
  reviewLeadDays: z.number().int().min(1).max(90).optional(),
  payrollReminderDay: z.number().int().min(1).max(28).optional(),
  alerts: z
    .object({
      expiry: z.boolean().optional(),
      timesheets: z.boolean().optional(),
      reviews: z.boolean().optional(),
      approvals: z.boolean().optional(),
      payroll: z.boolean().optional(),
      compliance: z.boolean().optional(),
    })
    .optional(),
});

export async function GET() {
  try {
    const session = await requirePermission("manageCompanySettings");
    await ensureAutomationSchema();
    const row = await prisma.automationSettings.findUnique({
      where: { companyId: session.user.companyId },
    });
    return NextResponse.json(parseAutomationSettings(row));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requirePermission("manageCompanySettings");
    await ensureAutomationSchema();
    const body = patchSchema.parse(await req.json());
    const current = parseAutomationSettings(
      await prisma.automationSettings.findUnique({
        where: { companyId: session.user.companyId },
      })
    );
    const next = parseAutomationSettings({
      expiryLeadDays: body.expiryLeadDays ?? current.expiryLeadDays,
      reviewLeadDays: body.reviewLeadDays ?? current.reviewLeadDays,
      payrollReminderDay: body.payrollReminderDay ?? current.payrollReminderDay,
      alerts: { ...current.alerts, ...body.alerts },
    });
    const row = await prisma.automationSettings.upsert({
      where: { companyId: session.user.companyId },
      create: {
        companyId: session.user.companyId,
        expiryLeadDays: next.expiryLeadDays,
        reviewLeadDays: next.reviewLeadDays,
        payrollReminderDay: next.payrollReminderDay,
        alerts: next.alerts,
      },
      update: {
        expiryLeadDays: next.expiryLeadDays,
        reviewLeadDays: next.reviewLeadDays,
        payrollReminderDay: next.payrollReminderDay,
        alerts: next.alerts,
      },
    });
    return NextResponse.json(parseAutomationSettings(row));
  } catch (error) {
    return handleApiError(error);
  }
}
