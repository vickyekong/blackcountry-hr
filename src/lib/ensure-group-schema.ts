import { prisma } from "@/lib/db";

let ensured = false;

/** Idempotent: group tree, new roles/statuses, projects, timesheets, files. */
export async function ensureGroupSchema() {
  if (ensured) return;

  await prisma.$executeRawUnsafe(
    `ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'BUSINESS_HEAD'`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TYPE "PayrollRunStatus" ADD VALUE IF NOT EXISTS 'FORWARDED_TO_FINANCE'`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TYPE "PayrollRunStatus" ADD VALUE IF NOT EXISTS 'PROCESSING'`
  );

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "parentId" TEXT`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Company_parentId_idx" ON "Company"("parentId")`
  );
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "Company"
        ADD CONSTRAINT "Company_parentId_fkey"
        FOREIGN KEY ("parentId") REFERENCES "Company"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "PayrollRun" ADD COLUMN IF NOT EXISTS "forwardedAt" TIMESTAMP(3)`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "PayrollRun" ADD COLUMN IF NOT EXISTS "processedAt" TIMESTAMP(3)`
  );

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "TimesheetStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "WorkspaceFileVisibility" AS ENUM ('EDITORS', 'ALL_FULL_TIME', 'SPECIFIC');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Project" (
      "id" TEXT NOT NULL,
      "companyId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "code" TEXT,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "Project_companyId_name_key" ON "Project"("companyId", "name")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Project_companyId_status_idx" ON "Project"("companyId", "status")`
  );
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "Project"
        ADD CONSTRAINT "Project_companyId_fkey"
        FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TimesheetEntry" (
      "id" TEXT NOT NULL,
      "companyId" TEXT NOT NULL,
      "employeeId" TEXT NOT NULL,
      "projectId" TEXT NOT NULL,
      "workDate" TIMESTAMP(3) NOT NULL,
      "minutes" INTEGER NOT NULL,
      "notes" TEXT,
      "status" "TimesheetStatus" NOT NULL DEFAULT 'DRAFT',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "TimesheetEntry_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "TimesheetEntry_employeeId_projectId_workDate_key" ON "TimesheetEntry"("employeeId", "projectId", "workDate")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "TimesheetEntry_companyId_workDate_idx" ON "TimesheetEntry"("companyId", "workDate")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "TimesheetEntry_employeeId_status_idx" ON "TimesheetEntry"("employeeId", "status")`
  );
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "TimesheetEntry"
        ADD CONSTRAINT "TimesheetEntry_companyId_fkey"
        FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "TimesheetEntry"
        ADD CONSTRAINT "TimesheetEntry_employeeId_fkey"
        FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "TimesheetEntry"
        ADD CONSTRAINT "TimesheetEntry_projectId_fkey"
        FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "WorkspaceFile" (
      "id" TEXT NOT NULL,
      "companyId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "fileUrl" TEXT NOT NULL,
      "folder" TEXT NOT NULL DEFAULT 'general',
      "visibility" "WorkspaceFileVisibility" NOT NULL DEFAULT 'EDITORS',
      "uploadedById" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "WorkspaceFile_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "WorkspaceFile_companyId_folder_idx" ON "WorkspaceFile"("companyId", "folder")`
  );
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "WorkspaceFile"
        ADD CONSTRAINT "WorkspaceFile_companyId_fkey"
        FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "WorkspaceFileGrant" (
      "id" TEXT NOT NULL,
      "fileId" TEXT NOT NULL,
      "employeeId" TEXT NOT NULL,
      CONSTRAINT "WorkspaceFileGrant_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "WorkspaceFileGrant_fileId_employeeId_key" ON "WorkspaceFileGrant"("fileId", "employeeId")`
  );
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "WorkspaceFileGrant"
        ADD CONSTRAINT "WorkspaceFileGrant_fileId_fkey"
        FOREIGN KEY ("fileId") REFERENCES "WorkspaceFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "WorkspaceFileGrant"
        ADD CONSTRAINT "WorkspaceFileGrant_employeeId_fkey"
        FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  const { ensureAppRls } = await import("@/lib/ensure-app-rls");
  await ensureAppRls();

  ensured = true;
}
