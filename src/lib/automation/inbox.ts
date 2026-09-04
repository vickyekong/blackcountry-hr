import { prisma } from "@/lib/db";
import { can, canReviewChangeType } from "@/lib/permissions";
import { employeeFullName } from "@/lib/utils";
import { inboxKindsForRole, type InboxKind } from "@/lib/automation/playbooks";
import type { UserRole } from "@prisma/client";

export type ApprovalItem = {
  id: string;
  kind: InboxKind;
  title: string;
  subtitle: string;
  href: string;
  createdAt: string;
};

function nameOf(row: { firstName: string; lastName: string; employeeCode?: string }) {
  const name = employeeFullName(row.firstName, row.lastName);
  return row.employeeCode ? `${name} · ${row.employeeCode}` : name;
}

export async function loadApprovalInbox(options: {
  companyId: string;
  role: UserRole;
  employeeId?: string | null;
}): Promise<ApprovalItem[]> {
  const kinds = inboxKindsForRole(options.role);
  const items: ApprovalItem[] = [];
  const companyId = options.companyId;

  if (kinds.includes("leave")) {
    const rows = await prisma.leaveRequest.findMany({
      where: { status: "PENDING", employee: { companyId } },
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
      orderBy: { createdAt: "asc" },
      take: 40,
    });
    for (const row of rows) {
      items.push({
        id: row.id,
        kind: "leave",
        title: `${row.type.replace(/_/g, " ")} leave · ${row.days} day${row.days === 1 ? "" : "s"}`,
        subtitle: nameOf(row.employee),
        href: "/leave",
        createdAt: row.createdAt.toISOString(),
      });
    }
  }

  if (kinds.includes("expense")) {
    const where =
      can(options.role, "reviewExpenses") || can(options.role, "reimburseExpenses")
        ? { companyId, status: "PENDING" as const }
        : options.employeeId
          ? {
              companyId,
              status: "PENDING" as const,
              employee: { managerId: options.employeeId },
            }
          : null;
    if (where) {
      const rows = await prisma.expenseClaim.findMany({
        where,
        include: {
          employee: { select: { firstName: true, lastName: true, employeeCode: true } },
        },
        orderBy: { createdAt: "asc" },
        take: 40,
      });
      for (const row of rows) {
        items.push({
          id: row.id,
          kind: "expense",
          title: "Expense claim",
          subtitle: nameOf(row.employee),
          href: "/expenses",
          createdAt: row.createdAt.toISOString(),
        });
      }
    }
  }

  if (kinds.includes("payroll") && can(options.role, "approvePayroll")) {
    const rows = await prisma.payrollRun.findMany({
      where: { companyId, status: "UNDER_REVIEW" },
      orderBy: { updatedAt: "asc" },
      take: 10,
    });
    for (const row of rows) {
      items.push({
        id: row.id,
        kind: "payroll",
        title: `Payroll awaiting Super Admin approval`,
        subtitle: `${String(row.periodMonth).padStart(2, "0")}/${row.periodYear}`,
        href: `/payroll/${row.id}?step=4`,
        createdAt: row.updatedAt.toISOString(),
      });
    }
  }

  if (kinds.includes("change")) {
    const rows = await prisma.employeeChangeRequest.findMany({
      where: { companyId, status: "PENDING" },
      include: {
        employee: { select: { firstName: true, lastName: true, employeeCode: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 40,
    });
    for (const row of rows) {
      if (!canReviewChangeType(options.role, row.type)) continue;
      items.push({
        id: row.id,
        kind: "change",
        title: `${row.type.replace(/_/g, " ")} change request`,
        subtitle: nameOf(row.employee),
        href: "/hr-ask?tab=changes",
        createdAt: row.createdAt.toISOString(),
      });
    }
  }

  if (kinds.includes("advance")) {
    const rows = await prisma.salaryAdvance.findMany({
      where: { companyId, status: "PENDING" },
      include: {
        employee: { select: { firstName: true, lastName: true, employeeCode: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 40,
    });
    for (const row of rows) {
      items.push({
        id: row.id,
        kind: "advance",
        title: "Salary advance",
        subtitle: nameOf(row.employee),
        href: "/payroll?tab=advances",
        createdAt: row.createdAt.toISOString(),
      });
    }
  }

  if (kinds.includes("loan")) {
    const rows = await prisma.salaryLoan.findMany({
      where: { companyId, status: "PENDING" },
      include: {
        employee: { select: { firstName: true, lastName: true, employeeCode: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 40,
    });
    for (const row of rows) {
      items.push({
        id: row.id,
        kind: "loan",
        title: "Staff loan",
        subtitle: nameOf(row.employee),
        href: "/payroll?tab=loans",
        createdAt: row.createdAt.toISOString(),
      });
    }
  }

  if (kinds.includes("overtime")) {
    const rows = await prisma.overtimeRequest.findMany({
      where: { companyId, status: "PENDING" },
      include: {
        employee: { select: { firstName: true, lastName: true, employeeCode: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 40,
    });
    for (const row of rows) {
      items.push({
        id: row.id,
        kind: "overtime",
        title: "Overtime request",
        subtitle: nameOf(row.employee),
        href: "/timesheets?tab=overtime",
        createdAt: row.createdAt.toISOString(),
      });
    }
  }

  if (kinds.includes("timesheet")) {
    const rows = await prisma.timesheetWeek.findMany({
      where: { companyId, status: "SUBMITTED" },
      include: {
        employee: { select: { firstName: true, lastName: true, employeeCode: true } },
      },
      orderBy: { updatedAt: "asc" },
      take: 40,
    });
    for (const row of rows) {
      items.push({
        id: row.id,
        kind: "timesheet",
        title: "Timesheet week to validate",
        subtitle: nameOf(row.employee),
        href: "/timesheets",
        createdAt: row.updatedAt.toISOString(),
      });
    }
  }

  if (kinds.includes("recruitment")) {
    const count = await prisma.jobApplication.count({
      where: {
        companyId,
        status: { in: ["NEW", "REVIEWING"] },
      },
    });
    if (count > 0) {
      items.push({
        id: "recruitment-queue",
        kind: "recruitment",
        title: `${count} application${count === 1 ? "" : "s"} to screen`,
        subtitle: "Recruitment pipeline",
        href: "/recruitment",
        createdAt: new Date().toISOString(),
      });
    }
  }

  items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return items;
}
