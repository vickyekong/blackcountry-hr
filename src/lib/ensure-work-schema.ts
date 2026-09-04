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

/** Idempotent: project managers, teams, task work fields, comments. */
export async function ensureWorkSchema() {
  if (ensured) return;

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "description" TEXT`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "managerEmployeeId" TEXT`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "startsOn" TIMESTAMP(3)`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "dueOn" TIMESTAMP(3)`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "budgetKobo" BIGINT NOT NULL DEFAULT 0`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Project_managerEmployeeId_idx" ON "Project"("managerEmployeeId")`
  );
  await addFk(
    "Project",
    "Project_managerEmployeeId_fkey",
    "managerEmployeeId",
    "Employee",
    "SET NULL"
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ProjectMember" (
      "id" TEXT NOT NULL,
      "projectId" TEXT NOT NULL,
      "employeeId" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'MEMBER',
      "plannedMinutesPerWeek" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "ProjectMember_projectId_employeeId_key" ON "ProjectMember"("projectId", "employeeId")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "ProjectMember_employeeId_idx" ON "ProjectMember"("employeeId")`
  );
  await addFk(
    "ProjectMember",
    "ProjectMember_projectId_fkey",
    "projectId",
    "Project"
  );
  await addFk(
    "ProjectMember",
    "ProjectMember_employeeId_fkey",
    "employeeId",
    "Employee"
  );

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "ProjectTask" ADD COLUMN IF NOT EXISTS "progress" TEXT NOT NULL DEFAULT 'TODO'`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "ProjectTask" ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'MEDIUM'`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "ProjectTask" ADD COLUMN IF NOT EXISTS "assigneeEmployeeId" TEXT`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "ProjectTask" ADD COLUMN IF NOT EXISTS "parentTaskId" TEXT`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "ProjectTask" ADD COLUMN IF NOT EXISTS "dueOn" TIMESTAMP(3)`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "ProjectTask_assigneeEmployeeId_idx" ON "ProjectTask"("assigneeEmployeeId")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "ProjectTask_parentTaskId_idx" ON "ProjectTask"("parentTaskId")`
  );
  await addFk(
    "ProjectTask",
    "ProjectTask_assigneeEmployeeId_fkey",
    "assigneeEmployeeId",
    "Employee",
    "SET NULL"
  );
  await addFk(
    "ProjectTask",
    "ProjectTask_parentTaskId_fkey",
    "parentTaskId",
    "ProjectTask",
    "SET NULL"
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ProjectTaskComment" (
      "id" TEXT NOT NULL,
      "taskId" TEXT NOT NULL,
      "authorUserId" TEXT NOT NULL,
      "body" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ProjectTaskComment_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "ProjectTaskComment_taskId_createdAt_idx" ON "ProjectTaskComment"("taskId", "createdAt")`
  );
  await addFk(
    "ProjectTaskComment",
    "ProjectTaskComment_taskId_fkey",
    "taskId",
    "ProjectTask"
  );
  await addFk(
    "ProjectTaskComment",
    "ProjectTaskComment_authorUserId_fkey",
    "authorUserId",
    "User"
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ProjectTaskAttachment" (
      "id" TEXT NOT NULL,
      "taskId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "fileUrl" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ProjectTaskAttachment_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "ProjectTaskAttachment_taskId_idx" ON "ProjectTaskAttachment"("taskId")`
  );
  await addFk(
    "ProjectTaskAttachment",
    "ProjectTaskAttachment_taskId_fkey",
    "taskId",
    "ProjectTask"
  );

  ensured = true;
}
