import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, handleApiError, AuthError } from "@/lib/api-auth";
import { nairaToKobo } from "@/lib/money";
import { serializeBigInts } from "@/lib/payroll/config-mapper";
import {
  isOmittedOrPlaceholderName,
  isPlaceholderLabel,
} from "@/lib/employees/data-quality";
import { startLifecycle } from "@/lib/lifecycle/service";
import { isShiftAttendanceExempt } from "@/lib/attendance/penalty-exempt";
import { isEmploymentEnded } from "@/lib/employees/status";
import { ensureEmployeeStatusSchema } from "@/lib/ensure-employee-status-schema";
import { ensureJobDescriptionName } from "@/lib/org/ensure-org-structure";
import { can } from "@/lib/permissions";
import { disableStaffPortal } from "@/lib/tenancy/bootstrap-company";
import { parseOptionalDate } from "@/lib/people/dates";
import { wouldCreateReportingCycle } from "@/lib/people/reporting-tree";
import { z } from "zod";

const realName = (label: string) =>
  z
    .string()
    .min(1)
    .refine((v) => !isOmittedOrPlaceholderName(v), {
      message: `${label} cannot be blank or a placeholder (N/A, Unknown, Test, …)`,
    });

const realLabel = (label: string) =>
  z
    .string()
    .min(1)
    .refine((v) => !isPlaceholderLabel(v), {
      message: `${label} cannot be blank or a placeholder`,
    });

const updateSchema = z.object({
  firstName: realName("First name").optional(),
  lastName: realName("Last name").optional(),
  department: z.string().trim().max(120).optional(),
  jobTitle: realLabel("Job description").optional(),
  status: z
    .enum(["ACTIVE", "SUSPENDED", "ON_LEAVE", "SICK_LEAVE", "FIRED", "RESIGNED"])
    .optional(),
  sex: z.enum(["MALE", "FEMALE"]).nullable().optional(),
  employmentType: z.enum(["FULL_TIME", "CONTRACT"]).optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  tin: z.string().optional(),
  rsaPin: z.string().optional(),
  nhfNumber: z.string().optional(),
  basicSalary: z.number().positive().optional(),
  housingAllowance: z.number().min(0).optional(),
  transportAllowance: z.number().min(0).optional(),
  otherTaxableAllowances: z.number().min(0).optional(),
  nonTaxableReimbursements: z.number().min(0).optional(),
  annualRent: z.number().min(0).optional(),
  nextOfKinName: z.string().optional(),
  nextOfKinPhone: z.string().optional(),
  clockDeviceId: z.string().nullable().optional(),
  shiftId: z.string().nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  addressLine: z.string().trim().max(400).nullable().optional(),
  workEmail: z.string().trim().email().max(180).nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  probationEnd: z.string().nullable().optional(),
  workLocation: z.string().trim().max(160).nullable().optional(),
  managerId: z.string().nullable().optional(),
  emergencyContactName: z.string().trim().max(120).nullable().optional(),
  emergencyContactPhone: z.string().trim().max(30).nullable().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("manageEmployees");
    await ensureEmployeeStatusSchema();
    const employee = await prisma.employee.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
      include: {
        leaveBalances: true,
        documents: true,
        shiftAssignment: { include: { shift: true } },
        user: { select: { id: true, email: true, role: true } },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            jobTitle: true,
          },
        },
      },
    });
    if (!employee) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(serializeBigInts(employee));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("manageEmployees");
    await ensureEmployeeStatusSchema();
    const body = updateSchema.parse(await req.json());

    const compensationFields = [
      body.basicSalary,
      body.housingAllowance,
      body.transportAllowance,
      body.otherTaxableAllowances,
      body.nonTaxableReimbursements,
      body.annualRent,
    ];
    if (
      compensationFields.some((v) => v !== undefined) &&
      !can(session.user.role, "manageCompensation")
    ) {
      throw new AuthError("Forbidden: compensation edits require manageCompensation", 403);
    }

    const sensitiveStatutory = [
      body.bankName,
      body.bankAccountNumber,
      body.tin,
      body.rsaPin,
      body.nhfNumber,
    ];
    if (
      sensitiveStatutory.some((v) => v !== undefined) &&
      session.user.role !== "SUPER_ADMIN"
    ) {
      throw new AuthError(
        "Bank details, TIN, RSA PIN, and NHF number require Super Admin clearance. Submit a change request from HR Ask for review.",
        403
      );
    }

    const existing = await prisma.employee.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let nextManagerId: string | null | undefined;
    if (body.managerId !== undefined) {
      if (!body.managerId) {
        nextManagerId = null;
      } else {
        const manager = await prisma.employee.findFirst({
          where: { id: body.managerId, companyId: session.user.companyId },
          select: { id: true },
        });
        if (!manager) {
          return NextResponse.json(
            { error: "Line manager not found in this company" },
            { status: 400 }
          );
        }
        const companyReports = await prisma.employee.findMany({
          where: { companyId: session.user.companyId },
          select: { id: true, managerId: true },
        });
        const reportsTo = new Map(
          companyReports.map((row) => [row.id, row.managerId])
        );
        if (wouldCreateReportingCycle(params.id, body.managerId, reportsTo)) {
          return NextResponse.json(
            { error: "That line manager would create a reporting cycle" },
            { status: 400 }
          );
        }
        nextManagerId = body.managerId;
      }
    }

    const dateOfBirth =
      body.dateOfBirth !== undefined
        ? parseOptionalDate(body.dateOfBirth)
        : undefined;
    const probationEnd =
      body.probationEnd !== undefined
        ? parseOptionalDate(body.probationEnd)
        : undefined;

    const employee = await prisma.employee.update({
      where: { id: params.id },
      data: {
        ...(body.firstName && { firstName: body.firstName }),
        ...(body.lastName && { lastName: body.lastName }),
        ...(body.department !== undefined && { department: body.department }),
        ...(body.jobTitle && { jobTitle: body.jobTitle }),
        ...(body.status && { status: body.status }),
        ...(body.sex !== undefined && { sex: body.sex }),
        ...(body.employmentType && { employmentType: body.employmentType }),
        ...(body.bankName !== undefined && { bankName: body.bankName }),
        ...(body.bankAccountNumber !== undefined && { bankAccountNumber: body.bankAccountNumber }),
        ...(body.tin !== undefined && { tin: body.tin }),
        ...(body.rsaPin !== undefined && { rsaPin: body.rsaPin }),
        ...(body.nhfNumber !== undefined && { nhfNumber: body.nhfNumber }),
        ...(body.basicSalary !== undefined && { basicSalaryKobo: nairaToKobo(body.basicSalary) }),
        ...(body.housingAllowance !== undefined && { housingAllowanceKobo: nairaToKobo(body.housingAllowance) }),
        ...(body.transportAllowance !== undefined && { transportAllowanceKobo: nairaToKobo(body.transportAllowance) }),
        ...(body.otherTaxableAllowances !== undefined && { otherTaxableAllowancesKobo: nairaToKobo(body.otherTaxableAllowances) }),
        ...(body.nonTaxableReimbursements !== undefined && { nonTaxableReimbursementsKobo: nairaToKobo(body.nonTaxableReimbursements) }),
        ...(body.annualRent !== undefined && { annualRentKobo: nairaToKobo(body.annualRent) }),
        ...(body.nextOfKinName !== undefined && { nextOfKinName: body.nextOfKinName }),
        ...(body.nextOfKinPhone !== undefined && { nextOfKinPhone: body.nextOfKinPhone }),
        ...(body.phone !== undefined && { phone: body.phone || null }),
        ...(body.addressLine !== undefined && { addressLine: body.addressLine || null }),
        ...(body.workEmail !== undefined && { workEmail: body.workEmail || null }),
        ...(body.clockDeviceId !== undefined && {
          clockDeviceId: body.clockDeviceId?.trim() || null,
        }),
        ...(body.workLocation !== undefined && {
          workLocation: body.workLocation?.trim() || null,
        }),
        ...(body.emergencyContactName !== undefined && {
          emergencyContactName: body.emergencyContactName?.trim() || null,
        }),
        ...(body.emergencyContactPhone !== undefined && {
          emergencyContactPhone: body.emergencyContactPhone?.trim() || null,
        }),
        ...(body.dateOfBirth !== undefined && { dateOfBirth }),
        ...(body.probationEnd !== undefined && { probationEnd }),
        ...(nextManagerId !== undefined && { managerId: nextManagerId }),
      },
    });

    if (body.jobTitle?.trim()) {
      await ensureJobDescriptionName(session.user.companyId, body.jobTitle).catch(
        () => null
      );
    }

    const effectiveDepartment = body.department ?? existing.department;
    const shiftExempt = isShiftAttendanceExempt(effectiveDepartment);

    if (shiftExempt) {
      await prisma.employeeShiftAssignment.deleteMany({
        where: { employeeId: params.id },
      });
    } else if (body.shiftId !== undefined) {
      if (body.shiftId) {
        const shift = await prisma.shiftTemplate.findFirst({
          where: { id: body.shiftId, companyId: session.user.companyId },
        });
        if (!shift) {
          return NextResponse.json({ error: "Shift not found" }, { status: 404 });
        }
        await prisma.employeeShiftAssignment.upsert({
          where: { employeeId: params.id },
          create: { employeeId: params.id, shiftId: body.shiftId },
          update: { shiftId: body.shiftId },
        });
      } else {
        await prisma.employeeShiftAssignment.deleteMany({
          where: { employeeId: params.id },
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        companyId: session.user.companyId,
        action: "UPDATE",
        entityType: "Employee",
        entityId: employee.id,
        performedById: session.user.id,
        changes: body,
      },
    });

    if (
      body.status &&
      isEmploymentEnded(body.status) &&
      !isEmploymentEnded(existing.status)
    ) {
      await startLifecycle({
        companyId: session.user.companyId,
        employeeId: employee.id,
        kind: "OFFBOARDING",
      });
    }

    if (
      body.employmentType === "CONTRACT" ||
      (body.status && isEmploymentEnded(body.status))
    ) {
      await disableStaffPortal({
        companyId: session.user.companyId,
        employeeId: employee.id,
      }).catch(() => null);
    }

    return NextResponse.json(serializeBigInts(employee));
  } catch (error) {
    return handleApiError(error);
  }
}
