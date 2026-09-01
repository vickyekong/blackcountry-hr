import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requireStaffEmployee } from "@/lib/api-auth";
import { serializeBigInts } from "@/lib/payroll/config-mapper";
import { ensureStaffPortalSchema } from "@/lib/ensure-staff-portal-schema";
import {
  annualRentLocked,
  isSensitiveFieldLocked,
  nairaStringToKobo,
  profileCompleteness,
} from "@/lib/staff/profile";
import { koboToNaira } from "@/lib/money";

const patchSchema = z.object({
  phone: z.string().trim().max(30).optional(),
  addressLine: z.string().trim().max(400).optional(),
  nextOfKinName: z.string().trim().max(120).optional(),
  nextOfKinPhone: z.string().trim().max(30).optional(),
  sex: z.enum(["MALE", "FEMALE"]).optional(),
  bankName: z.string().trim().max(80).optional(),
  bankAccountNumber: z.string().trim().max(20).optional(),
  tin: z.string().trim().max(40).optional(),
  rsaPin: z.string().trim().max(40).optional(),
  nhfNumber: z.string().trim().max(40).optional(),
  annualRent: z.number().min(0).optional(),
});

function staffProfilePayload(employee: {
  employeeCode: string;
  firstName: string;
  lastName: string;
  department: string;
  jobTitle: string;
  employmentType: string;
  status: string;
  sex: string | null;
  startDate: Date;
  bankName: string | null;
  bankAccountNumber: string | null;
  tin: string | null;
  rsaPin: string | null;
  nhfNumber: string | null;
  basicSalaryKobo: bigint;
  housingAllowanceKobo: bigint;
  transportAllowanceKobo: bigint;
  otherTaxableAllowancesKobo: bigint;
  annualRentKobo: bigint;
  nextOfKinName: string | null;
  nextOfKinPhone: string | null;
  workEmail: string | null;
  phone: string | null;
  addressLine: string | null;
}) {
  const completeness = profileCompleteness({
    sex: employee.sex,
    phone: employee.phone,
    addressLine: employee.addressLine,
    nextOfKinName: employee.nextOfKinName,
    nextOfKinPhone: employee.nextOfKinPhone,
    bankName: employee.bankName,
    bankAccountNumber: employee.bankAccountNumber,
    tin: employee.tin,
  });

  return serializeBigInts({
    employeeCode: employee.employeeCode,
    firstName: employee.firstName,
    lastName: employee.lastName,
    department: employee.department,
    jobTitle: employee.jobTitle,
    employmentType: employee.employmentType,
    status: employee.status,
    sex: employee.sex,
    startDate: employee.startDate,
    workEmail: employee.workEmail,
    phone: employee.phone,
    addressLine: employee.addressLine,
    nextOfKinName: employee.nextOfKinName,
    nextOfKinPhone: employee.nextOfKinPhone,
    bankName: employee.bankName,
    bankAccountNumber: employee.bankAccountNumber,
    tin: employee.tin,
    rsaPin: employee.rsaPin,
    nhfNumber: employee.nhfNumber,
    annualRentNaira: koboToNaira(employee.annualRentKobo),
    compensation: {
      basicSalaryKobo: employee.basicSalaryKobo,
      housingAllowanceKobo: employee.housingAllowanceKobo,
      transportAllowanceKobo: employee.transportAllowanceKobo,
      otherTaxableAllowancesKobo: employee.otherTaxableAllowancesKobo,
    },
    locked: {
      bankName: isSensitiveFieldLocked(employee, "bankName"),
      bankAccountNumber: isSensitiveFieldLocked(employee, "bankAccountNumber"),
      tin: isSensitiveFieldLocked(employee, "tin"),
      rsaPin: isSensitiveFieldLocked(employee, "rsaPin"),
      nhfNumber: isSensitiveFieldLocked(employee, "nhfNumber"),
      annualRent: annualRentLocked(employee.annualRentKobo),
    },
    completeness,
  });
}

export async function GET() {
  try {
    const session = await requireStaffEmployee();
    await ensureStaffPortalSchema();
    const employee = await prisma.employee.findFirst({
      where: { id: session.employeeId, companyId: session.user.companyId },
    });
    if (!employee) {
      return NextResponse.json({ error: "Staff record not found" }, { status: 404 });
    }
    return NextResponse.json(staffProfilePayload(employee));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireStaffEmployee();
    await ensureStaffPortalSchema();
    const body = patchSchema.parse(await req.json());
    const employee = await prisma.employee.findFirst({
      where: { id: session.employeeId, companyId: session.user.companyId },
    });
    if (!employee) {
      return NextResponse.json({ error: "Staff record not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};

    if (body.phone !== undefined) data.phone = body.phone || null;
    if (body.addressLine !== undefined) data.addressLine = body.addressLine || null;
    if (body.nextOfKinName !== undefined) {
      data.nextOfKinName = body.nextOfKinName || null;
    }
    if (body.nextOfKinPhone !== undefined) {
      data.nextOfKinPhone = body.nextOfKinPhone || null;
    }
    if (body.sex !== undefined) data.sex = body.sex;

    const lockedAttempts: string[] = [];
    const trySensitive = (
      field: "bankName" | "bankAccountNumber" | "tin" | "rsaPin" | "nhfNumber",
      value: string | undefined
    ) => {
      if (value === undefined) return;
      if (isSensitiveFieldLocked(employee, field) && value !== (employee[field] ?? "")) {
        lockedAttempts.push(field);
        return;
      }
      data[field] = value || null;
    };

    trySensitive("bankName", body.bankName);
    trySensitive("bankAccountNumber", body.bankAccountNumber);
    trySensitive("tin", body.tin);
    trySensitive("rsaPin", body.rsaPin);
    trySensitive("nhfNumber", body.nhfNumber);

    if (body.annualRent !== undefined) {
      if (annualRentLocked(employee.annualRentKobo) && body.annualRent > 0) {
        lockedAttempts.push("annualRent");
      } else {
        data.annualRentKobo = nairaStringToKobo(body.annualRent);
      }
    }

    if (lockedAttempts.length > 0) {
      return NextResponse.json(
        {
          error:
            "Bank, TIN, RSA, NHF, and rent already on file need a company request so HR / Super Admin can clear the change.",
          lockedFields: lockedAttempts,
        },
        { status: 400 }
      );
    }

    const updated = await prisma.employee.update({
      where: { id: employee.id },
      data: data as Parameters<typeof prisma.employee.update>[0]["data"],
    });

    await prisma.auditLog.create({
      data: {
        companyId: session.user.companyId,
        action: "UPDATE",
        entityType: "Employee",
        entityId: employee.id,
        performedById: session.user.id,
        changes: { source: "staff_portal", fields: Object.keys(data) },
      },
    });

    return NextResponse.json(staffProfilePayload(updated));
  } catch (error) {
    return handleApiError(error);
  }
}
