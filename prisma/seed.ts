import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_NTA2025_TAX_BANDS } from "../src/lib/payroll/paye";

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.upsert({
    where: { id: "seed-company" },
    update: { name: "Blackcountry Group" },
    create: {
      id: "seed-company",
      name: "Blackcountry Group",
      address: "12 Victoria Island, Lagos",
    },
  });

  await prisma.statutoryConfig.upsert({
    where: { companyId: company.id },
    update: {},
    create: {
      companyId: company.id,
      taxReliefMode: "NTA2025",
    },
  });

  for (let i = 0; i < DEFAULT_NTA2025_TAX_BANDS.length; i++) {
    const band = DEFAULT_NTA2025_TAX_BANDS[i];
    await prisma.taxBand.upsert({
      where: { id: `seed-band-${i}` },
      update: {},
      create: {
        id: `seed-band-${i}`,
        companyId: company.id,
        lowerBoundKobo: band.lowerBoundKobo,
        upperBoundKobo: band.upperBoundKobo,
        rateBps: band.rateBps,
        sortOrder: i,
      },
    });
  }

  const passwordHash = await bcrypt.hash("password123", 12);

  const users = [
    { email: "admin@blackcountry.ng", name: "Super Admin", role: "SUPER_ADMIN" as UserRole },
    { email: "hr@blackcountry.ng", name: "HR Admin", role: "HR_ADMIN" as UserRole },
    { email: "finance@blackcountry.ng", name: "Amaka Finance", role: "FINANCE" as UserRole },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role, name: u.name, passwordHash },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash,
        companyId: company.id,
      },
    });
  }

  // Legacy cleanup no longer deletes Finance — it is a first-class portal

  const subsidiary = await prisma.company.upsert({
    where: { id: "seed-subsidiary" },
    update: { parentId: company.id, name: "Blackcountry Foods Ltd" },
    create: {
      id: "seed-subsidiary",
      name: "Blackcountry Foods Ltd",
      address: "8 Trans Amadi, Port Harcourt",
      parentId: company.id,
    },
  });

  await prisma.statutoryConfig.upsert({
    where: { companyId: subsidiary.id },
    update: {},
    create: {
      companyId: subsidiary.id,
      taxReliefMode: "NTA2025",
    },
  });

  for (let i = 0; i < DEFAULT_NTA2025_TAX_BANDS.length; i++) {
    const band = DEFAULT_NTA2025_TAX_BANDS[i];
    await prisma.taxBand.upsert({
      where: { id: `seed-sub-band-${i}` },
      update: {},
      create: {
        id: `seed-sub-band-${i}`,
        companyId: subsidiary.id,
        lowerBoundKobo: band.lowerBoundKobo,
        upperBoundKobo: band.upperBoundKobo,
        rateBps: band.rateBps,
        sortOrder: i,
      },
    });
  }

  await prisma.user.upsert({
    where: { email: "head@blackcountry.ng" },
    update: {
      role: "BUSINESS_HEAD",
      name: "Ifeanyi Okoro",
      passwordHash,
      companyId: subsidiary.id,
    },
    create: {
      email: "head@blackcountry.ng",
      name: "Ifeanyi Okoro",
      role: "BUSINESS_HEAD",
      passwordHash,
      companyId: subsidiary.id,
    },
  });

  const headEmployee = await prisma.employee.upsert({
    where: {
      companyId_employeeCode: {
        companyId: subsidiary.id,
        employeeCode: "BF-001",
      },
    },
    update: {
      firstName: "Ifeanyi",
      lastName: "Okoro",
      workEmail: "head@blackcountry.ng",
    },
    create: {
      employeeCode: "BF-001",
      firstName: "Ifeanyi",
      lastName: "Okoro",
      sex: "MALE",
      department: "Management",
      jobTitle: "Business head",
      basicSalaryKobo: 80000000n,
      housingAllowanceKobo: 20000000n,
      transportAllowanceKobo: 5000000n,
      companyId: subsidiary.id,
      startDate: new Date("2024-01-15"),
      status: "ACTIVE",
      employmentType: "FULL_TIME",
      workEmail: "head@blackcountry.ng",
    },
  });
  await prisma.user.update({
    where: { email: "head@blackcountry.ng" },
    data: { employeeId: headEmployee.id },
  });

  await prisma.project.upsert({
    where: {
      companyId_name: { companyId: company.id, name: "HQ operations" },
    },
    update: {},
    create: {
      companyId: company.id,
      name: "HQ operations",
      code: "HQ",
    },
  });

  await prisma.project.upsert({
    where: {
      companyId_name: { companyId: subsidiary.id, name: "Plant line A" },
    },
    update: {},
    create: {
      companyId: subsidiary.id,
      name: "Plant line A",
      code: "PLA",
    },
  });

  const departmentNames = ["Engineering", "Finance", "HR", "Management"];
  for (const name of departmentNames) {
    await prisma.department.upsert({
      where: {
        companyId_name: { companyId: company.id, name },
      },
      update: {},
      create: { companyId: company.id, name },
    });
  }

  const employees = [
    {
      employeeCode: "EMP-001",
      firstName: "Adaeze",
      lastName: "Okonkwo",
      sex: "FEMALE" as const,
      department: "Engineering",
      jobTitle: "Senior Developer",
      basicSalaryKobo: 50000000n,
      housingAllowanceKobo: 20000000n,
      transportAllowanceKobo: 5000000n,
    },
    {
      employeeCode: "EMP-002",
      firstName: "Chidi",
      lastName: "Eze",
      sex: "MALE" as const,
      department: "Finance",
      jobTitle: "Accountant",
      basicSalaryKobo: 35000000n,
      housingAllowanceKobo: 15000000n,
      transportAllowanceKobo: 3000000n,
    },
    {
      employeeCode: "EMP-003",
      firstName: "Fatima",
      lastName: "Bello",
      sex: "FEMALE" as const,
      department: "HR",
      jobTitle: "HR Officer",
      basicSalaryKobo: 28000000n,
      housingAllowanceKobo: 10000000n,
      transportAllowanceKobo: 2500000n,
    },
  ];

  for (const emp of employees) {
    const employee = await prisma.employee.upsert({
      where: {
        companyId_employeeCode: {
          companyId: company.id,
          employeeCode: emp.employeeCode,
        },
      },
      update: {
        sex: emp.sex,
      },
      create: {
        ...emp,
        companyId: company.id,
        startDate: new Date("2024-01-15"),
        bankName: "GTBank",
        bankAccountNumber: "0123456789",
        tin: "12345678-0001",
        status: "ACTIVE",
        employmentType: "FULL_TIME",
      },
    });

    await prisma.leaveBalance.upsert({
      where: {
        employeeId_leaveType_year: {
          employeeId: employee.id,
          leaveType: "ANNUAL",
          year: 2026,
        },
      },
      update: {},
      create: {
        employeeId: employee.id,
        leaveType: "ANNUAL",
        year: 2026,
        entitledDays: 21,
        usedDays: 3,
      },
    });
  }

  const contract = await prisma.employee.upsert({
    where: {
      companyId_employeeCode: {
        companyId: company.id,
        employeeCode: "EMP-004",
      },
    },
    update: { employmentType: "CONTRACT" },
    create: {
      employeeCode: "EMP-004",
      firstName: "Tunde",
      lastName: "Adeyemi",
      sex: "MALE",
      department: "Operations",
      jobTitle: "Contract analyst",
      basicSalaryKobo: 18000000n,
      housingAllowanceKobo: 0n,
      transportAllowanceKobo: 0n,
      companyId: company.id,
      startDate: new Date("2025-06-01"),
      status: "ACTIVE",
      employmentType: "CONTRACT",
    },
  });
  await prisma.user.deleteMany({
    where: { employeeId: contract.id, role: "EMPLOYEE" },
  });

  const adaeze = await prisma.employee.findFirst({
    where: { companyId: company.id, employeeCode: "EMP-001" },
    select: { id: true, firstName: true, lastName: true },
  });
  if (adaeze) {
    await prisma.user.upsert({
      where: { email: "adaeze@blackcountry.ng" },
      update: {
        role: "EMPLOYEE",
        name: `${adaeze.firstName} ${adaeze.lastName}`,
        passwordHash,
        employeeId: adaeze.id,
        companyId: company.id,
      },
      create: {
        email: "adaeze@blackcountry.ng",
        name: `${adaeze.firstName} ${adaeze.lastName}`,
        role: "EMPLOYEE",
        passwordHash,
        companyId: company.id,
        employeeId: adaeze.id,
      },
    });
    await prisma.employee.update({
      where: { id: adaeze.id },
      data: { workEmail: "adaeze@blackcountry.ng" },
    });
  }

  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          "admin@acme.ng",
          "hr@acme.ng",
          "finance@acme.ng",
          "adaeze@acme.ng",
          "head@acme-foods.ng",
        ],
      },
    },
  });

  console.log("Seed completed.");
  console.log("Group Super Admin: admin@blackcountry.ng / password123");
  console.log("Group HR:          hr@blackcountry.ng / password123");
  console.log("Group Finance:     finance@blackcountry.ng / password123");
  console.log("Business head:     head@blackcountry.ng / password123 (Blackcountry Foods)");
  console.log("Staff (full-time): adaeze@blackcountry.ng / password123");
  console.log("Contract (no login): EMP-004 Tunde Adeyemi");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
