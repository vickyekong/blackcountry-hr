import { prisma } from "@/lib/db";
import { getMonthName } from "@/lib/utils";
import { getAppBaseUrl } from "@/lib/app-url";
import { payrollApproverCompanyIds } from "@/lib/tenancy/workspace";
import type { UserRole } from "@prisma/client";

export { getAppBaseUrl } from "@/lib/app-url";

export function payrollReviewUrl(runId: string): string {
  return `${getAppBaseUrl()}/payroll/${runId}?step=4`;
}

export function financePayrollUrl(runId: string): string {
  return `${getAppBaseUrl()}/finance/${runId}`;
}

/** In-app notify Super Admin that HR submitted payroll and needs approval. */
export async function notifyPayrollSubmitted(options: {
  companyId: string;
  runId: string;
  periodMonth: number;
  periodYear: number;
  submittedByName: string;
  excludeUserId?: string;
}) {
  const periodLabel = `${getMonthName(options.periodMonth)} ${options.periodYear}`;
  const linkUrl = payrollReviewUrl(options.runId);
  const companyIds = await payrollApproverCompanyIds(options.companyId);

  const recipients = await prisma.user.findMany({
    where: {
      companyId: { in: companyIds },
      role: "SUPER_ADMIN",
      ...(options.excludeUserId ? { id: { not: options.excludeUserId } } : {}),
    },
    select: { id: true, email: true, name: true, role: true },
  });

  const title = `Payroll awaiting your approval — ${periodLabel}`;
  const body = `HR (${options.submittedByName}) submitted ${periodLabel} payroll for your approval. Open the link to approve or send it back.`;

  const notifications = await Promise.all(
    recipients.map(async (user) => {
      const notification = await prisma.notification.create({
        data: {
          companyId: options.companyId,
          userId: user.id,
          type: "PAYROLL_REVIEW",
          title,
          body,
          linkUrl,
          entityType: "PayrollRun",
          entityId: options.runId,
        },
      });

      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        notificationId: notification.id,
      };
    })
  );

  return { linkUrl, periodLabel, recipients: notifications };
}

export async function notifyUsersInRoles(options: {
  companyId: string;
  roles: UserRole[];
  type: string;
  title: string;
  body: string;
  linkUrl: string;
  entityType?: string;
  entityId?: string;
  excludeUserId?: string;
}) {
  const recipients = await prisma.user.findMany({
    where: {
      companyId: options.companyId,
      role: { in: options.roles },
      ...(options.excludeUserId ? { id: { not: options.excludeUserId } } : {}),
    },
    select: { id: true },
  });
  if (recipients.length === 0) return 0;

  await prisma.notification.createMany({
    data: recipients.map((user) => ({
      companyId: options.companyId,
      userId: user.id,
      type: options.type,
      title: options.title,
      body: options.body,
      linkUrl: options.linkUrl,
      entityType: options.entityType,
      entityId: options.entityId,
    })),
  });
  return recipients.length;
}

export async function notifyEmployeeUser(options: {
  companyId: string;
  employeeId: string;
  type: string;
  title: string;
  body: string;
  linkUrl: string;
  entityType?: string;
  entityId?: string;
}) {
  const user = await prisma.user.findFirst({
    where: {
      companyId: options.companyId,
      employeeId: options.employeeId,
      role: "EMPLOYEE",
    },
    select: { id: true },
  });
  if (!user) return;
  await prisma.notification.create({
    data: {
      companyId: options.companyId,
      userId: user.id,
      type: options.type,
      title: options.title,
      body: options.body,
      linkUrl: options.linkUrl,
      entityType: options.entityType,
      entityId: options.entityId,
    },
  });
}

export async function notifyPayrollForwardedToFinance(options: {
  companyId: string;
  runId: string;
  periodMonth: number;
  periodYear: number;
  forwardedByName: string;
  excludeUserId?: string;
}) {
  const periodLabel = `${getMonthName(options.periodMonth)} ${options.periodYear}`;
  const linkUrl = financePayrollUrl(options.runId);
  return notifyUsersInRoles({
    companyId: options.companyId,
    roles: ["FINANCE"],
    type: "PAYROLL_FINANCE",
    title: `Payroll ready to process — ${periodLabel}`,
    body: `HR (${options.forwardedByName}) forwarded ${periodLabel} payroll. Open Finance to process payment.`,
    linkUrl,
    entityType: "PayrollRun",
    entityId: options.runId,
    excludeUserId: options.excludeUserId,
  });
}

export async function notifyPayrollProcessingComplete(options: {
  companyId: string;
  runId: string;
  periodMonth: number;
  periodYear: number;
  processedByName: string;
  excludeUserId?: string;
}) {
  const periodLabel = `${getMonthName(options.periodMonth)} ${options.periodYear}`;
  const linkUrl = payrollReviewUrl(options.runId);
  return notifyUsersInRoles({
    companyId: options.companyId,
    roles: ["HR_ADMIN", "SUPER_ADMIN"],
    type: "PAYROLL_PAID",
    title: `Payroll processing complete — ${periodLabel}`,
    body: `Finance (${options.processedByName}) finished processing ${periodLabel} payroll. Payslips are marked paid.`,
    linkUrl,
    entityType: "PayrollRun",
    entityId: options.runId,
    excludeUserId: options.excludeUserId,
  });
}
