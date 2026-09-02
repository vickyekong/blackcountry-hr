import { addMonths, differenceInMonths, startOfMonth, endOfMonth } from "date-fns";
import { prisma } from "@/lib/db";
import { displayName } from "@/lib/employees/data-quality";
import { formatCurrency, formatDate } from "@/lib/utils";

export type HrAskResult = {
  id: string;
  title: string;
  summary: string;
  rows: Array<Record<string, string>>;
  href?: string;
};

export async function runHrAskQuery(
  companyId: string,
  queryId: string
): Promise<HrAskResult> {
  const now = new Date();

  switch (queryId) {
    case "appraisal-due": {
      const employees = await prisma.employee.findMany({
        where: { companyId, status: { notIn: ["FIRED", "RESIGNED"] } },
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          department: true,
          jobTitle: true,
          startDate: true,
        },
      });
      const due = employees.filter((e) => {
        const months = differenceInMonths(now, e.startDate);
        if (months < 11) return false;
        // Anniversary month ≈ start month this year or next within 30 days
        const thisYearAnniv = new Date(
          now.getFullYear(),
          e.startDate.getMonth(),
          e.startDate.getDate()
        );
        const days =
          (thisYearAnniv.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return days >= -15 && days <= 45;
      });
      return {
        id: queryId,
        title: "Employees due for ~1-year appraisal",
        summary: `${due.length} staff near their hire anniversary this cycle`,
        href: "/performance",
        rows: due.map((e) => ({
          code: e.employeeCode,
          name: displayName(e.firstName, e.lastName, e.employeeCode),
          department: e.department,
          title: e.jobTitle,
          started: formatDate(e.startDate),
          tenureMonths: String(differenceInMonths(now, e.startDate)),
        })),
      };
    }

    case "missing-rsa": {
      const employees = await prisma.employee.findMany({
        where: {
          companyId,
          status: { in: ["ACTIVE", "ON_LEAVE", "SICK_LEAVE"] },
          OR: [{ rsaPin: null }, { rsaPin: "" }],
        },
        select: {
          employeeCode: true,
          firstName: true,
          lastName: true,
          department: true,
        },
      });
      return {
        id: queryId,
        title: "Staff missing RSA PIN",
        summary: `${employees.length} active staff without pension PIN`,
        href: "/employees",
        rows: employees.map((e) => ({
          code: e.employeeCode,
          name: displayName(e.firstName, e.lastName, e.employeeCode),
          department: e.department,
        })),
      };
    }

    case "missing-bank": {
      const employees = await prisma.employee.findMany({
        where: {
          companyId,
          status: { in: ["ACTIVE", "ON_LEAVE"] },
        },
        select: {
          employeeCode: true,
          firstName: true,
          lastName: true,
          bankName: true,
          bankAccountNumber: true,
          department: true,
        },
      });
      const missing = employees.filter(
        (e) => !e.bankName?.trim() || !e.bankAccountNumber?.trim()
      );
      return {
        id: queryId,
        title: "Staff missing bank details",
        summary: `${missing.length} need bank setup before payroll`,
        href: "/employees",
        rows: missing.map((e) => ({
          code: e.employeeCode,
          name: displayName(e.firstName, e.lastName, e.employeeCode),
          department: e.department,
        })),
      };
    }

    case "birthdays-month": {
      const month = now.getMonth();
      const employees = await prisma.employee.findMany({
        where: { companyId, status: { notIn: ["FIRED", "RESIGNED"] } },
        select: {
          employeeCode: true,
          firstName: true,
          lastName: true,
          department: true,
          startDate: true,
          dateOfBirth: true,
        },
      });
      const birthdayRows = employees
        .filter((e) => e.dateOfBirth && e.dateOfBirth.getMonth() === month)
        .map((e) => ({
          code: e.employeeCode,
          name: displayName(e.firstName, e.lastName, e.employeeCode),
          department: e.department,
          birthday: formatDate(
            new Date(
              now.getFullYear(),
              e.dateOfBirth!.getMonth(),
              e.dateOfBirth!.getDate()
            )
          ),
        }));
      const anniversaryRows = employees
        .filter((e) => e.startDate.getMonth() === month)
        .map((e) => ({
          code: e.employeeCode,
          name: displayName(e.firstName, e.lastName, e.employeeCode),
          department: e.department,
          hireAnniversary: formatDate(
            new Date(
              now.getFullYear(),
              e.startDate.getMonth(),
              e.startDate.getDate()
            )
          ),
        }));
      return {
        id: queryId,
        title:
          birthdayRows.length > 0
            ? "Birthdays and hire anniversaries this month"
            : "Hire anniversaries this month",
        summary:
          birthdayRows.length > 0
            ? `${birthdayRows.length} birthday(s), ${anniversaryRows.length} hire anniversary(ies)`
            : `${anniversaryRows.length} staff with a hire anniversary this month`,
        href: "/employees",
        rows: birthdayRows.length > 0 ? birthdayRows : anniversaryRows,
      };
    }

    case "open-onboarding": {
      const open = await prisma.employeeLifecycle.findMany({
        where: { companyId, kind: "ONBOARDING", status: "OPEN" },
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
              department: true,
            },
          },
          tasks: { where: { status: "PENDING" } },
        },
      });
      return {
        id: queryId,
        title: "Open onboarding checklists",
        summary: `${open.length} new hires still onboarding — open staff profile to complete`,
        href: "/employees",
        rows: open.map((l) => ({
          code: l.employee.employeeCode,
          name: displayName(
            l.employee.firstName,
            l.employee.lastName,
            l.employee.employeeCode
          ),
          department: l.employee.department,
          pendingTasks: String(l.tasks.length),
          openProfile: `/employees/${l.employee.id}`,
        })),
      };
    }

    case "open-offboarding": {
      const open = await prisma.employeeLifecycle.findMany({
        where: { companyId, kind: "OFFBOARDING", status: "OPEN" },
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              firstName: true,
              lastName: true,
              department: true,
            },
          },
          tasks: { where: { status: "PENDING" } },
        },
      });
      return {
        id: queryId,
        title: "Open offboarding checklists",
        summary: `${open.length} exits in progress — open staff profile to complete`,
        href: "/employees",
        rows: open.map((l) => ({
          code: l.employee.employeeCode,
          name: displayName(
            l.employee.firstName,
            l.employee.lastName,
            l.employee.employeeCode
          ),
          department: l.employee.department,
          pendingTasks: String(l.tasks.length),
          openProfile: `/employees/${l.employee.id}`,
        })),
      };
    }

    case "pending-change-requests": {
      const pending = await prisma.employeeChangeRequest.findMany({
        where: { companyId, status: "PENDING" },
        include: {
          employee: {
            select: {
              employeeCode: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });
      return {
        id: queryId,
        title: "Pending employee change requests",
        summary: `${pending.length} waiting for HR Approve/Reject`,
        href: "/hr-ask",
        rows: pending.map((r) => ({
          code: r.employee.employeeCode,
          name: displayName(
            r.employee.firstName,
            r.employee.lastName,
            r.employee.employeeCode
          ),
          type: r.type,
          submitted: formatDate(r.createdAt),
        })),
      };
    }

    case "probation-ending": {
      const inThreeMonths = addMonths(now, 3);
      const employees = await prisma.employee.findMany({
        where: {
          companyId,
          status: "ACTIVE",
          startDate: {
            gte: addMonths(now, -6),
            lte: addMonths(now, -3),
          },
        },
        select: {
          employeeCode: true,
          firstName: true,
          lastName: true,
          department: true,
          startDate: true,
        },
      });
      // ~3–6 months tenure → typical probation window ending
      return {
        id: queryId,
        title: "Probation window (3–6 months tenure)",
        summary: `${employees.length} staff in typical probation review window`,
        href: "/employees",
        rows: employees.map((e) => ({
          code: e.employeeCode,
          name: displayName(e.firstName, e.lastName, e.employeeCode),
          department: e.department,
          started: formatDate(e.startDate),
          tenureMonths: String(differenceInMonths(now, e.startDate)),
          note: `Review before ${formatDate(inThreeMonths)}`,
        })),
      };
    }

    case "wage-bill-snapshot": {
      const active = await prisma.employee.findMany({
        where: { companyId, status: "ACTIVE" },
        select: {
          basicSalaryKobo: true,
          housingAllowanceKobo: true,
          transportAllowanceKobo: true,
        },
      });
      const basic = active.reduce((s, e) => s + e.basicSalaryKobo, 0n);
      const grossish = active.reduce(
        (s, e) =>
          s +
          e.basicSalaryKobo +
          e.housingAllowanceKobo +
          e.transportAllowanceKobo,
        0n
      );
      return {
        id: queryId,
        title: "Active wage-bill snapshot",
        summary: `${active.length} active staff`,
        href: "/reports",
        rows: [
          {
            metric: "Headcount",
            value: String(active.length),
          },
          {
            metric: "Monthly basic",
            value: formatCurrency(basic),
          },
          {
            metric: "Monthly basic + housing + transport",
            value: formatCurrency(grossish),
          },
        ],
      };
    }

    case "leave-this-month": {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      const leave = await prisma.leaveRequest.findMany({
        where: {
          status: { in: ["APPROVED", "PENDING"] },
          startDate: { lte: end },
          endDate: { gte: start },
          employee: { companyId },
        },
        include: {
          employee: {
            select: {
              employeeCode: true,
              firstName: true,
              lastName: true,
              department: true,
            },
          },
        },
      });
      return {
        id: queryId,
        title: "Leave overlapping this month",
        summary: `${leave.length} leave request(s)`,
        href: "/leave",
        rows: leave.map((l) => ({
          code: l.employee.employeeCode,
          name: displayName(
            l.employee.firstName,
            l.employee.lastName,
            l.employee.employeeCode
          ),
          department: l.employee.department,
          type: l.type,
          status: l.status,
          days: String(l.days),
        })),
      };
    }

    case "overtime-pending": {
      const rows = await prisma.overtimeRequest.findMany({
        where: { companyId, status: "PENDING" },
        include: {
          employee: {
            select: {
              employeeCode: true,
              firstName: true,
              lastName: true,
              department: true,
            },
          },
        },
        orderBy: { workDate: "asc" },
        take: 50,
      });
      return {
        id: queryId,
        title: "Pending overtime requests",
        summary: `${rows.length} request(s) waiting for HR approval`,
        href: "/timesheets?tab=overtime",
        rows: rows.map((row) => ({
          code: row.employee.employeeCode,
          name: displayName(
            row.employee.firstName,
            row.employee.lastName,
            row.employee.employeeCode
          ),
          department: row.employee.department,
          date: formatDate(row.workDate),
          hours: (row.minutes / 60).toFixed(2),
        })),
      };
    }

    default:
      throw new Error("Unknown query");
  }
}

export const HR_ASK_QUERIES: Array<{ id: string; label: string; hint: string }> =
  [
    {
      id: "appraisal-due",
      label: "Who is due for a 1-year appraisal?",
      hint: "Hire anniversary within the next ~45 days",
    },
    {
      id: "missing-rsa",
      label: "Staff missing RSA PIN",
      hint: "Pension remittance blockers",
    },
    {
      id: "missing-bank",
      label: "Staff missing bank details",
      hint: "Cannot disburse payroll",
    },
    {
      id: "birthdays-month",
      label: "Birthdays / hire anniversaries this month",
      hint: "Uses date of birth when recorded, otherwise hire anniversary",
    },
    {
      id: "open-onboarding",
      label: "Open onboarding checklists",
      hint: "New hires still incomplete",
    },
    {
      id: "open-offboarding",
      label: "Open offboarding checklists",
      hint: "Exits in progress",
    },
    {
      id: "pending-change-requests",
      label: "Pending change requests",
      hint: "Bank / tax / next-of-kin awaiting approval",
    },
    {
      id: "probation-ending",
      label: "Probation review window",
      hint: "3–6 months tenure",
    },
    {
      id: "wage-bill-snapshot",
      label: "Active wage-bill snapshot",
      hint: "Quick cost glance",
    },
    {
      id: "leave-this-month",
      label: "Leave this month",
      hint: "Approved and pending",
    },
    {
      id: "overtime-pending",
      label: "Pending overtime requests",
      hint: "Extra hours waiting for approval",
    },
  ];
