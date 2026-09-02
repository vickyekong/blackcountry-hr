import { prisma } from "@/lib/db";

let ensured = false;

/** Idempotent: employee profile extras, skills, certifications, assets. */
export async function ensurePeopleSchema() {
  if (ensured) return;

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3)`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "probationEnd" TIMESTAMP(3)`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "workLocation" TEXT`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "managerId" TEXT`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "emergencyContactName" TEXT`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "emergencyContactPhone" TEXT`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Employee_managerId_idx" ON "Employee"("managerId")`
  );
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "Employee"
        ADD CONSTRAINT "Employee_managerId_fkey"
        FOREIGN KEY ("managerId") REFERENCES "Employee"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Department" ADD COLUMN IF NOT EXISTS "managerEmployeeId" TEXT`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Department_managerEmployeeId_idx" ON "Department"("managerEmployeeId")`
  );
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "Department"
        ADD CONSTRAINT "Department_managerEmployeeId_fkey"
        FOREIGN KEY ("managerEmployeeId") REFERENCES "Employee"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "EmployeeDocument" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'OTHER'`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "EmployeeDocument" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3)`
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Skill" (
      "id" TEXT NOT NULL,
      "companyId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "Skill_companyId_name_key" ON "Skill"("companyId", "name")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Skill_companyId_idx" ON "Skill"("companyId")`
  );
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "Skill"
        ADD CONSTRAINT "Skill_companyId_fkey"
        FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "EmployeeSkill" (
      "id" TEXT NOT NULL,
      "employeeId" TEXT NOT NULL,
      "skillId" TEXT NOT NULL,
      "level" TEXT NOT NULL DEFAULT 'INTERMEDIATE',
      CONSTRAINT "EmployeeSkill_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "EmployeeSkill_employeeId_skillId_key" ON "EmployeeSkill"("employeeId", "skillId")`
  );
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "EmployeeSkill"
        ADD CONSTRAINT "EmployeeSkill_employeeId_fkey"
        FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "EmployeeSkill"
        ADD CONSTRAINT "EmployeeSkill_skillId_fkey"
        FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "EmployeeCertification" (
      "id" TEXT NOT NULL,
      "employeeId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "issuer" TEXT,
      "issuedAt" TIMESTAMP(3),
      "expiresAt" TIMESTAMP(3),
      "fileUrl" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "EmployeeCertification_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "EmployeeCertification_employeeId_expiresAt_idx" ON "EmployeeCertification"("employeeId", "expiresAt")`
  );
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "EmployeeCertification"
        ADD CONSTRAINT "EmployeeCertification_employeeId_fkey"
        FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CompanyAsset" (
      "id" TEXT NOT NULL,
      "companyId" TEXT NOT NULL,
      "assetCode" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "assetType" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
      "serialNumber" TEXT,
      "valueKobo" BIGINT NOT NULL DEFAULT 0,
      "purchasedAt" TIMESTAMP(3),
      "assignedEmployeeId" TEXT,
      "assignedAt" TIMESTAMP(3),
      "condition" TEXT,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "CompanyAsset_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "CompanyAsset_companyId_assetCode_key" ON "CompanyAsset"("companyId", "assetCode")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "CompanyAsset_companyId_status_idx" ON "CompanyAsset"("companyId", "status")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "CompanyAsset_assignedEmployeeId_idx" ON "CompanyAsset"("assignedEmployeeId")`
  );
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "CompanyAsset"
        ADD CONSTRAINT "CompanyAsset_companyId_fkey"
        FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "CompanyAsset"
        ADD CONSTRAINT "CompanyAsset_assignedEmployeeId_fkey"
        FOREIGN KEY ("assignedEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  ensured = true;
}
