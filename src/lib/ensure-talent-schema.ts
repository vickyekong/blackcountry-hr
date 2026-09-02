import { prisma } from "@/lib/db";

let ensured = false;

/** Recruitment extras, training, and performance — additive, non-destructive. */
export async function ensureTalentSchema() {
  if (ensured) return;

  for (const value of ["INTERVIEW", "ASSESSMENT", "OFFER"] as const) {
    await prisma.$executeRawUnsafe(
      `ALTER TYPE "JobApplicationStatus" ADD VALUE IF NOT EXISTS '${value}'`
    );
  }

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "JobListing" ADD COLUMN IF NOT EXISTS "openings" INTEGER NOT NULL DEFAULT 1`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "JobListing" ADD COLUMN IF NOT EXISTS "deadline" TIMESTAMP(3)`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "JobListing" ADD COLUMN IF NOT EXISTS "salaryMinKobo" BIGINT`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "JobListing" ADD COLUMN IF NOT EXISTS "salaryMaxKobo" BIGINT`
  );

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "JobApplication" ADD COLUMN IF NOT EXISTS "notes" TEXT`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "JobApplication" ADD COLUMN IF NOT EXISTS "interviewAt" TIMESTAMP(3)`
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "JobListingSkill" (
      "listingId" TEXT NOT NULL,
      "skillId" TEXT NOT NULL,
      CONSTRAINT "JobListingSkill_pkey" PRIMARY KEY ("listingId", "skillId")
    )
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "JobListingSkill"
        ADD CONSTRAINT "JobListingSkill_listingId_fkey"
        FOREIGN KEY ("listingId") REFERENCES "JobListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "JobListingSkill"
        ADD CONSTRAINT "JobListingSkill_skillId_fkey"
        FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TrainingProgram" (
      "id" TEXT NOT NULL,
      "companyId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "required" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "TrainingProgram_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "TrainingProgram_companyId_name_key" ON "TrainingProgram"("companyId", "name")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "TrainingProgram_companyId_idx" ON "TrainingProgram"("companyId")`
  );
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "TrainingProgram"
        ADD CONSTRAINT "TrainingProgram_companyId_fkey"
        FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TrainingEnrollment" (
      "id" TEXT NOT NULL,
      "programId" TEXT NOT NULL,
      "employeeId" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
      "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "completedAt" TIMESTAMP(3),
      "notes" TEXT,
      CONSTRAINT "TrainingEnrollment_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "TrainingEnrollment_programId_employeeId_key" ON "TrainingEnrollment"("programId", "employeeId")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "TrainingEnrollment_employeeId_status_idx" ON "TrainingEnrollment"("employeeId", "status")`
  );
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "TrainingEnrollment"
        ADD CONSTRAINT "TrainingEnrollment_programId_fkey"
        FOREIGN KEY ("programId") REFERENCES "TrainingProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "TrainingEnrollment"
        ADD CONSTRAINT "TrainingEnrollment_employeeId_fkey"
        FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PerformanceGoal" (
      "id" TEXT NOT NULL,
      "companyId" TEXT NOT NULL,
      "employeeId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "target" TEXT NOT NULL,
      "actual" TEXT NOT NULL DEFAULT '',
      "weight" INTEGER NOT NULL DEFAULT 100,
      "periodYear" INTEGER NOT NULL,
      "periodLabel" TEXT NOT NULL DEFAULT 'ANNUAL',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "PerformanceGoal_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "PerformanceGoal_employeeId_periodYear_idx" ON "PerformanceGoal"("employeeId", "periodYear")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "PerformanceGoal_companyId_periodYear_idx" ON "PerformanceGoal"("companyId", "periodYear")`
  );
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "PerformanceGoal"
        ADD CONSTRAINT "PerformanceGoal_companyId_fkey"
        FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "PerformanceGoal"
        ADD CONSTRAINT "PerformanceGoal_employeeId_fkey"
        FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PerformanceReview" (
      "id" TEXT NOT NULL,
      "companyId" TEXT NOT NULL,
      "employeeId" TEXT NOT NULL,
      "periodYear" INTEGER NOT NULL,
      "periodLabel" TEXT NOT NULL DEFAULT 'ANNUAL',
      "status" TEXT NOT NULL DEFAULT 'DRAFT',
      "selfNotes" TEXT,
      "managerNotes" TEXT,
      "selfScore" INTEGER,
      "managerScore" INTEGER,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "PerformanceReview_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "PerformanceReview_employeeId_periodYear_periodLabel_key" ON "PerformanceReview"("employeeId", "periodYear", "periodLabel")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "PerformanceReview_companyId_periodYear_status_idx" ON "PerformanceReview"("companyId", "periodYear", "status")`
  );
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "PerformanceReview"
        ADD CONSTRAINT "PerformanceReview_companyId_fkey"
        FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "PerformanceReview"
        ADD CONSTRAINT "PerformanceReview_employeeId_fkey"
        FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  ensured = true;
}
