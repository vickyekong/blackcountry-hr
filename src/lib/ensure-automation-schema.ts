import { prisma } from "@/lib/db";

let ensured = false;

async function addFk(
  table: string,
  constraint: string,
  column: string,
  refTable: string
) {
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "${table}"
        ADD CONSTRAINT "${constraint}"
        FOREIGN KEY ("${column}") REFERENCES "${refTable}"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
}

/** Idempotent: reminder settings and job logs. Does not replace approval engines. */
export async function ensureAutomationSchema() {
  if (ensured) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AutomationSettings" (
      "id" TEXT NOT NULL,
      "companyId" TEXT NOT NULL,
      "expiryLeadDays" INTEGER NOT NULL DEFAULT 60,
      "reviewLeadDays" INTEGER NOT NULL DEFAULT 14,
      "payrollReminderDay" INTEGER NOT NULL DEFAULT 25,
      "alerts" JSONB,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AutomationSettings_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "AutomationSettings_companyId_key" ON "AutomationSettings"("companyId")`
  );
  await addFk(
    "AutomationSettings",
    "AutomationSettings_companyId_fkey",
    "companyId",
    "Company"
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AutomationJobLog" (
      "id" TEXT NOT NULL,
      "companyId" TEXT NOT NULL,
      "job" TEXT NOT NULL,
      "createdCount" INTEGER NOT NULL DEFAULT 0,
      "detail" TEXT NOT NULL DEFAULT '',
      "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AutomationJobLog_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "AutomationJobLog_companyId_job_ranAt_idx" ON "AutomationJobLog"("companyId", "job", "ranAt")`
  );
  await addFk(
    "AutomationJobLog",
    "AutomationJobLog_companyId_fkey",
    "companyId",
    "Company"
  );

  ensured = true;
}
