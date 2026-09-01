import bcrypt from "bcryptjs";
import type { Company, User, UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DEFAULT_NTA2025_TAX_BANDS } from "@/lib/payroll/paye";

const DEFAULT_DEPARTMENTS = ["Management", "HR", "Finance", "Operations"];
/** Fast enough for signup UX; still strong for online attacks. */
const BCRYPT_ROUNDS = 10;

export class TenancyError extends Error {
  constructor(
    message: string,
    public status: number = 400
  ) {
    super(message);
  }
}

export type BootstrapCompanyInput = {
  companyName: string;
  address?: string | null;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
};

export type BootstrapCompanyResult = {
  company: Pick<Company, "id" | "name">;
  admin: Pick<User, "id" | "email" | "name" | "role" | "companyId">;
};

/** Create a tenant with NTA 2025 statutory defaults + Super Admin. */
export async function bootstrapCompany(
  input: BootstrapCompanyInput
): Promise<BootstrapCompanyResult> {
  const companyName = input.companyName.trim();
  const adminName = input.adminName.trim();
  const adminEmail = input.adminEmail.trim().toLowerCase();
  const address = input.address?.trim() || null;

  if (companyName.length < 2) {
    throw new TenancyError("Company name must be at least 2 characters");
  }
  if (adminName.length < 2) {
    throw new TenancyError("Admin name must be at least 2 characters");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    throw new TenancyError("Enter a valid admin email");
  }
  if (input.adminPassword.length < 8) {
    throw new TenancyError("Password must be at least 8 characters");
  }

  // Parallelize uniqueness check + hash (skip DDL here — schema already migrated).
  const [existing, passwordHash] = await Promise.all([
    prisma.user.findUnique({
      where: { email: adminEmail },
      select: { id: true },
    }),
    bcrypt.hash(input.adminPassword, BCRYPT_ROUNDS),
  ]);
  if (existing) {
    throw new TenancyError(
      "That email is already registered. Sign in or use a different email.",
      409
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: companyName,
        address,
      },
      select: { id: true, name: true },
    });

    await tx.statutoryConfig.create({
      data: {
        companyId: company.id,
        taxReliefMode: "NTA2025",
      },
    });

    await tx.taxBand.createMany({
      data: DEFAULT_NTA2025_TAX_BANDS.map((band, i) => ({
        companyId: company.id,
        lowerBoundKobo: band.lowerBoundKobo,
        upperBoundKobo: band.upperBoundKobo,
        rateBps: band.rateBps,
        sortOrder: i,
      })),
    });

    await tx.department.createMany({
      data: DEFAULT_DEPARTMENTS.map((name) => ({
        companyId: company.id,
        name,
      })),
      skipDuplicates: true,
    });

    const admin = await tx.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        role: "SUPER_ADMIN",
        passwordHash,
        companyId: company.id,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
      },
    });

    return { company, admin };
  });

  try {
    await prisma.attendanceSettings.create({
      data: { companyId: result.company.id },
    });
  } catch {
    // Optional — attendance routes upsert settings on first use.
  }

  return result;
}

export type InviteTeamUserInput = {
  companyId: string;
  name: string;
  email: string;
  password: string;
  role: Extract<
    UserRole,
    "HR_ADMIN" | "SUPER_ADMIN" | "FINANCE" | "BUSINESS_HEAD"
  >;
};

/** Invite Super Admin, HR, Finance, or a business head into this company. */
export async function inviteTeamUser(input: InviteTeamUserInput) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();

  if (name.length < 2) {
    throw new TenancyError("Name must be at least 2 characters");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new TenancyError("Enter a valid email");
  }
  if (input.password.length < 8) {
    throw new TenancyError("Password must be at least 8 characters");
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, companyId: true },
  });
  if (existing) {
    throw new TenancyError(
      existing.companyId === input.companyId
        ? "That user is already on your team."
        : "That email is already registered to another company.",
      409
    );
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  return prisma.user.create({
    data: {
      email,
      name,
      role: input.role,
      passwordHash,
      companyId: input.companyId,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      companyId: true,
    },
  });
}

export type EnableStaffPortalInput = {
  companyId: string;
  employeeId: string;
  email: string;
  password: string;
};

/** Create or reset a Staff (EMPLOYEE) login linked to a staff record. */
export async function enableStaffPortal(input: EnableStaffPortalInput) {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new TenancyError("Enter a valid email");
  }
  if (input.password.length < 8) {
    throw new TenancyError("Password must be at least 8 characters");
  }

  const employee = await prisma.employee.findFirst({
    where: { id: input.employeeId, companyId: input.companyId },
    include: { user: { select: { id: true, email: true } } },
  });
  if (!employee) {
    throw new TenancyError("Employee not found", 404);
  }
  if (employee.employmentType === "CONTRACT") {
    throw new TenancyError(
      "Contract staff do not get a login. Create a full-time profile to issue portal access.",
      400
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, companyId: true, employeeId: true },
  });

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  if (employee.user) {
    if (existing && existing.id !== employee.user.id) {
      throw new TenancyError(
        existing.companyId === input.companyId
          ? "That email is already used by another login."
          : "That email is already registered to another company.",
        409
      );
    }
    const updated = await prisma.user.update({
      where: { id: employee.user.id },
      data: { email, passwordHash, name: `${employee.firstName} ${employee.lastName}` },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!employee.workEmail) {
      await prisma.employee.update({
        where: { id: employee.id },
        data: { workEmail: email },
      });
    }
    return updated;
  }

  if (existing) {
    throw new TenancyError(
      existing.companyId === input.companyId
        ? "That email is already used by another login."
        : "That email is already registered to another company.",
      409
    );
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: `${employee.firstName} ${employee.lastName}`,
      role: "EMPLOYEE",
      passwordHash,
      companyId: input.companyId,
      employeeId: employee.id,
    },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!employee.workEmail) {
    await prisma.employee.update({
      where: { id: employee.id },
      data: { workEmail: email },
    });
  }

  return user;
}

export async function disableStaffPortal(options: {
  companyId: string;
  employeeId: string;
}) {
  const user = await prisma.user.findFirst({
    where: {
      companyId: options.companyId,
      employeeId: options.employeeId,
      role: "EMPLOYEE",
    },
    select: { id: true },
  });
  if (!user) {
    throw new TenancyError("No staff portal login on this record", 404);
  }
  await prisma.user.delete({ where: { id: user.id } });
  return { ok: true };
}

export type CreateSubsidiaryInput = {
  parentCompanyId: string;
  name: string;
  address?: string | null;
};

/** Register a sub-company under a group. v1: one level only (no grandchildren). */
export async function createSubsidiary(input: CreateSubsidiaryInput) {
  const name = input.name.trim();
  if (name.length < 2) {
    throw new TenancyError("Sub-company name must be at least 2 characters");
  }

  const parent = await prisma.company.findUnique({
    where: { id: input.parentCompanyId },
    include: {
      statutoryConfig: true,
      taxBands: { orderBy: { sortOrder: "asc" } },
      departments: { select: { name: true } },
    },
  });
  if (!parent) {
    throw new TenancyError("Group company not found", 404);
  }
  if (parent.parentId) {
    throw new TenancyError(
      "A sub-company cannot have its own subsidiaries in this version.",
      400
    );
  }

  const address = input.address?.trim() || null;

  const result = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name,
        address,
        parentId: parent.id,
      },
      select: { id: true, name: true, parentId: true },
    });

    const statutory = parent.statutoryConfig;
    await tx.statutoryConfig.create({
      data: {
        companyId: company.id,
        taxReliefMode: statutory?.taxReliefMode ?? "NTA2025",
        pensionEmployeeRate: statutory?.pensionEmployeeRate,
        pensionEmployerRate: statutory?.pensionEmployerRate,
        pensionBasis: statutory?.pensionBasis,
        nhfEnabled: statutory?.nhfEnabled,
        nhfRate: statutory?.nhfRate,
        nsitfRate: statutory?.nsitfRate,
        taxFreeThresholdKobo: statutory?.taxFreeThresholdKobo,
        craFixedKobo: statutory?.craFixedKobo,
        craPercentBps: statutory?.craPercentBps,
        craGrossPercentBps: statutory?.craGrossPercentBps,
        rentReliefCapKobo: statutory?.rentReliefCapKobo,
        minimumWageExemptKobo: statutory?.minimumWageExemptKobo,
        workingDaysPerMonth: statutory?.workingDaysPerMonth,
      },
    });

    const bands =
      parent.taxBands.length > 0
        ? parent.taxBands
        : DEFAULT_NTA2025_TAX_BANDS.map((band, i) => ({
            lowerBoundKobo: band.lowerBoundKobo,
            upperBoundKobo: band.upperBoundKobo,
            rateBps: band.rateBps,
            sortOrder: i,
          }));

    await tx.taxBand.createMany({
      data: bands.map((band, i) => ({
        companyId: company.id,
        lowerBoundKobo: band.lowerBoundKobo,
        upperBoundKobo: band.upperBoundKobo,
        rateBps: band.rateBps,
        sortOrder: "sortOrder" in band ? band.sortOrder : i,
      })),
    });

    const deptNames =
      parent.departments.length > 0
        ? parent.departments.map((d) => d.name)
        : DEFAULT_DEPARTMENTS;

    await tx.department.createMany({
      data: deptNames.map((deptName) => ({
        companyId: company.id,
        name: deptName,
      })),
      skipDuplicates: true,
    });

    return company;
  });

  try {
    await prisma.attendanceSettings.create({
      data: { companyId: result.id },
    });
  } catch {
    // Optional
  }

  return result;
}

