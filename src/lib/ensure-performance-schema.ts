import { prisma } from "@/lib/db";

let ensured = false;

async function addFk(
  table: string,
  constraint: string,
  column: string,
  refTable: string,
  onDelete = "CASCADE"
) {
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "${table}"
        ADD CONSTRAINT "${constraint}"
        FOREIGN KEY ("${column}") REFERENCES "${refTable}"("id")
        ON DELETE ${onDelete} ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
}

/** Idempotent: company/dept goals, KPI numbers, peer/final appraisal, recognition. */
export async function ensurePerformanceSchema() {
  if (ensured) return;

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "PerformanceGoal" ALTER COLUMN "employeeId" DROP NOT NULL`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "PerformanceGoal" ADD COLUMN IF NOT EXISTS "scope" TEXT NOT NULL DEFAULT 'INDIVIDUAL'`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "PerformanceGoal" ADD COLUMN IF NOT EXISTS "department" TEXT`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "PerformanceGoal" ADD COLUMN IF NOT EXISTS "targetValue" DOUBLE PRECISION`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "PerformanceGoal" ADD COLUMN IF NOT EXISTS "actualValue" DOUBLE PRECISION`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "PerformanceGoal" ADD COLUMN IF NOT EXISTS "unit" TEXT`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "PerformanceGoal_companyId_scope_periodYear_idx" ON "PerformanceGoal"("companyId", "scope", "periodYear")`
  );

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "PerformanceReview" ADD COLUMN IF NOT EXISTS "peerNotes" TEXT`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "PerformanceReview" ADD COLUMN IF NOT EXISTS "peerScore" INTEGER`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "PerformanceReview" ADD COLUMN IF NOT EXISTS "finalNotes" TEXT`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "PerformanceReview" ADD COLUMN IF NOT EXISTS "finalScore" INTEGER`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "PerformanceReview" ADD COLUMN IF NOT EXISTS "peerEmployeeId" TEXT`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "PerformanceReview_peerEmployeeId_idx" ON "PerformanceReview"("peerEmployeeId")`
  );
  await addFk(
    "PerformanceReview",
    "PerformanceReview_peerEmployeeId_fkey",
    "peerEmployeeId",
    "Employee",
    "SET NULL"
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Recognition" (
      "id" TEXT NOT NULL,
      "companyId" TEXT NOT NULL,
      "employeeId" TEXT NOT NULL,
      "givenById" TEXT NOT NULL,
      "kind" TEXT NOT NULL,
      "note" TEXT NOT NULL DEFAULT '',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Recognition_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Recognition_companyId_createdAt_idx" ON "Recognition"("companyId", "createdAt")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Recognition_employeeId_idx" ON "Recognition"("employeeId")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Recognition_givenById_idx" ON "Recognition"("givenById")`
  );
  await addFk(
    "Recognition",
    "Recognition_companyId_fkey",
    "companyId",
    "Company"
  );
  await addFk(
    "Recognition",
    "Recognition_employeeId_fkey",
    "employeeId",
    "Employee"
  );
  await addFk(
    "Recognition",
    "Recognition_givenById_fkey",
    "givenById",
    "User",
    "RESTRICT"
  );

  ensured = true;
}
