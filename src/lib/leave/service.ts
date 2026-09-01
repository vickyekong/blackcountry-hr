import { prisma } from "@/lib/db";
import { countWorkingDaysBetween } from "@/lib/leave/unpaid-leave";
import type { LeaveType } from "@prisma/client";

export class LeaveServiceError extends Error {
  constructor(
    message: string,
    public status: number = 400
  ) {
    super(message);
  }
}

export async function createLeaveRequest(options: {
  companyId: string;
  employeeId: string;
  type: LeaveType;
  startDate: Date;
  endDate: Date;
  days?: number;
  reason?: string;
}) {
  const employee = await prisma.employee.findFirst({
    where: { id: options.employeeId, companyId: options.companyId },
    select: { id: true, firstName: true, lastName: true, employeeCode: true },
  });
  if (!employee) {
    throw new LeaveServiceError("Employee not found", 404);
  }

  if (options.endDate < options.startDate) {
    throw new LeaveServiceError("End date must be on or after start date");
  }

  const computedDays = countWorkingDaysBetween(
    options.startDate,
    options.endDate
  );
  if (computedDays < 1) {
    throw new LeaveServiceError("Leave must include at least one working day");
  }

  const days = options.days ?? computedDays;
  if (days !== computedDays) {
    throw new LeaveServiceError(
      `Working days between dates is ${computedDays}, but ${days} was submitted`
    );
  }

  if (options.type === "ANNUAL") {
    const year = options.startDate.getFullYear();
    const balance = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveType_year: {
          employeeId: options.employeeId,
          leaveType: "ANNUAL",
          year,
        },
      },
    });
    const remaining = (balance?.entitledDays ?? 21) - (balance?.usedDays ?? 0);
    if (days > remaining) {
      throw new LeaveServiceError(
        `Insufficient annual leave balance (${remaining} days remaining)`
      );
    }
  }

  const request = await prisma.leaveRequest.create({
    data: {
      employeeId: options.employeeId,
      type: options.type,
      startDate: options.startDate,
      endDate: options.endDate,
      days,
      reason: options.reason,
      status: "PENDING",
    },
  });

  return { request, employee };
}
