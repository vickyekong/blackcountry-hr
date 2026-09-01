import { prisma } from "@/lib/db";

let ensured = false;

export async function ensureRecruitmentSchema() {
  if (ensured) return;

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "JobListingStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'FILLED');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "JobApplicationStatus" AS ENUM ('NEW', 'REVIEWING', 'SHORTLISTED', 'REJECTED', 'HIRED');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "JobBoard" AS ENUM ('CAREERS_PAGE', 'LINKEDIN', 'INDEED', 'JOBBERMAN', 'HOT_NIGERIAN_JOBS', 'OTHER');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "JobListingPostStatus" AS ENUM ('READY', 'POSTED', 'FAILED');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "JobListing" (
      "id" TEXT NOT NULL,
      "companyId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "department" TEXT NOT NULL,
      "location" TEXT NOT NULL DEFAULT 'Nigeria',
      "employmentType" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
      "description" TEXT NOT NULL,
      "requirements" TEXT,
      "status" "JobListingStatus" NOT NULL DEFAULT 'DRAFT',
      "viewCount" INTEGER NOT NULL DEFAULT 0,
      "createdById" TEXT,
      "publishedAt" TIMESTAMP(3),
      "closedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "JobListing_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "JobListing_companyId_status_idx" ON "JobListing"("companyId", "status")`
  );
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "JobListing"
        ADD CONSTRAINT "JobListing_companyId_fkey"
        FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "JobListing"
        ADD CONSTRAINT "JobListing_createdById_fkey"
        FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "JobListingPost" (
      "id" TEXT NOT NULL,
      "listingId" TEXT NOT NULL,
      "board" "JobBoard" NOT NULL,
      "status" "JobListingPostStatus" NOT NULL DEFAULT 'READY',
      "externalUrl" TEXT,
      "lastError" TEXT,
      "postedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "JobListingPost_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "JobListingPost_listingId_board_key" ON "JobListingPost"("listingId", "board")`
  );
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "JobListingPost"
        ADD CONSTRAINT "JobListingPost_listingId_fkey"
        FOREIGN KEY ("listingId") REFERENCES "JobListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "JobApplication" (
      "id" TEXT NOT NULL,
      "companyId" TEXT NOT NULL,
      "listingId" TEXT NOT NULL,
      "firstName" TEXT NOT NULL,
      "lastName" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "phone" TEXT,
      "resumeUrl" TEXT,
      "coverLetter" TEXT,
      "source" "JobBoard" NOT NULL DEFAULT 'CAREERS_PAGE',
      "status" "JobApplicationStatus" NOT NULL DEFAULT 'NEW',
      "hiredEmployeeId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "JobApplication_listingId_status_idx" ON "JobApplication"("listingId", "status")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "JobApplication_companyId_createdAt_idx" ON "JobApplication"("companyId", "createdAt")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "JobApplication_listingId_email_key" ON "JobApplication"("listingId", "email")`
  );
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "JobApplication"
        ADD CONSTRAINT "JobApplication_companyId_fkey"
        FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "JobApplication"
        ADD CONSTRAINT "JobApplication_listingId_fkey"
        FOREIGN KEY ("listingId") REFERENCES "JobListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "JobApplication"
        ADD CONSTRAINT "JobApplication_hiredEmployeeId_fkey"
        FOREIGN KEY ("hiredEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  for (const table of ["JobListing", "JobListingPost", "JobApplication"] as const) {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`
    );
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          EXECUTE format('REVOKE ALL ON TABLE %I FROM anon', '${table}');
        END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          EXECUTE format('REVOKE ALL ON TABLE %I FROM authenticated', '${table}');
        END IF;
      END $$;
    `);
  }

  ensured = true;
}
