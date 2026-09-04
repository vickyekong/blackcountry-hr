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

/** Idempotent: expense claims and reimbursement tracking. */
export async function ensureExpenseSchema() {
  if (ensured) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ExpenseClaim" (
      "id" TEXT NOT NULL,
      "companyId" TEXT NOT NULL,
      "employeeId" TEXT NOT NULL,
      "category" TEXT NOT NULL DEFAULT 'OTHER',
      "amountKobo" BIGINT NOT NULL,
      "approvedAmountKobo" BIGINT NOT NULL DEFAULT 0,
      "description" TEXT NOT NULL,
      "incurredOn" TIMESTAMP(3) NOT NULL,
      "receiptUrl" TEXT,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "approvedById" TEXT,
      "approvedAt" TIMESTAMP(3),
      "reviewNote" TEXT,
      "reimbursementMethod" TEXT,
      "reimbursementRef" TEXT,
      "reimbursedAt" TIMESTAMP(3),
      "reimbursedById" TEXT,
      "payrollRunId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "ExpenseClaim_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "ExpenseClaim_companyId_status_idx" ON "ExpenseClaim"("companyId", "status")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "ExpenseClaim_employeeId_idx" ON "ExpenseClaim"("employeeId")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "ExpenseClaim_payrollRunId_idx" ON "ExpenseClaim"("payrollRunId")`
  );
  await addFk("ExpenseClaim", "ExpenseClaim_companyId_fkey", "companyId", "Company");
  await addFk(
    "ExpenseClaim",
    "ExpenseClaim_employeeId_fkey",
    "employeeId",
    "Employee"
  );
  await addFk(
    "ExpenseClaim",
    "ExpenseClaim_approvedById_fkey",
    "approvedById",
    "User",
    "SET NULL"
  );
  await addFk(
    "ExpenseClaim",
    "ExpenseClaim_reimbursedById_fkey",
    "reimbursedById",
    "User",
    "SET NULL"
  );
  await addFk(
    "ExpenseClaim",
    "ExpenseClaim_payrollRunId_fkey",
    "payrollRunId",
    "PayrollRun",
    "SET NULL"
  );

  ensured = true;
}
