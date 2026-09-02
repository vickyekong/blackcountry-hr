import { prisma } from "@/lib/db";

let ensured = false;

/** Idempotent: company holidays, overtime requests, shift date exceptions. */
export async function ensureTimeSchema() {
  if (ensured) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CompanyHoliday" (
      "id" TEXT NOT NULL,
      "companyId" TEXT NOT NULL,
      "workDate" TIMESTAMP(3) NOT NULL,
      "name" TEXT NOT NULL,
      "kind" TEXT NOT NULL DEFAULT 'PUBLIC',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "CompanyHoliday_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "CompanyHoliday_companyId_workDate_key" ON "CompanyHoliday"("companyId", "workDate")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "CompanyHoliday_companyId_workDate_idx" ON "CompanyHoliday"("companyId", "workDate")`
  );
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "CompanyHoliday"
        ADD CONSTRAINT "CompanyHoliday_companyId_fkey"
        FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "OvertimeRequest" (
      "id" TEXT NOT NULL,
      "companyId" TEXT NOT NULL,
      "employeeId" TEXT NOT NULL,
      "workDate" TIMESTAMP(3) NOT NULL,
      "minutes" INTEGER NOT NULL,
      "reason" TEXT,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "amountKobo" BIGINT,
      "approvedById" TEXT,
      "approvedAt" TIMESTAMP(3),
      "payrollRunId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "OvertimeRequest_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "OvertimeRequest_companyId_status_idx" ON "OvertimeRequest"("companyId", "status")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "OvertimeRequest_employeeId_workDate_idx" ON "OvertimeRequest"("employeeId", "workDate")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "OvertimeRequest_payrollRunId_idx" ON "OvertimeRequest"("payrollRunId")`
  );
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "OvertimeRequest"
        ADD CONSTRAINT "OvertimeRequest_companyId_fkey"
        FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "OvertimeRequest"
        ADD CONSTRAINT "OvertimeRequest_employeeId_fkey"
        FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "OvertimeRequest"
        ADD CONSTRAINT "OvertimeRequest_approvedById_fkey"
        FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "OvertimeRequest"
        ADD CONSTRAINT "OvertimeRequest_payrollRunId_fkey"
        FOREIGN KEY ("payrollRunId") REFERENCES "PayrollRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ShiftException" (
      "id" TEXT NOT NULL,
      "companyId" TEXT NOT NULL,
      "employeeId" TEXT NOT NULL,
      "workDate" TIMESTAMP(3) NOT NULL,
      "kind" TEXT NOT NULL,
      "shiftId" TEXT,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "ShiftException_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "ShiftException_employeeId_workDate_key" ON "ShiftException"("employeeId", "workDate")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "ShiftException_companyId_workDate_idx" ON "ShiftException"("companyId", "workDate")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "ShiftException_shiftId_idx" ON "ShiftException"("shiftId")`
  );
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "ShiftException"
        ADD CONSTRAINT "ShiftException_companyId_fkey"
        FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "ShiftException"
        ADD CONSTRAINT "ShiftException_employeeId_fkey"
        FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "ShiftException"
        ADD CONSTRAINT "ShiftException_shiftId_fkey"
        FOREIGN KEY ("shiftId") REFERENCES "ShiftTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  ensured = true;
}
