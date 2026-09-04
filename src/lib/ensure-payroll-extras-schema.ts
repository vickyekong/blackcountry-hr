import { prisma } from "@/lib/db";
import { runEnsureOnce } from "@/lib/ensure-once";

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

/** Idempotent: salary structures, benefits, deductions, advances, loans, remittances. */
export async function ensurePayrollExtrasSchema() {
  return runEnsureOnce("payroll-extras-schema", ensurePayrollExtrasSchemaUnlocked);
}

async function ensurePayrollExtrasSchemaUnlocked() {
  if (ensured) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SalaryStructure" (
      "id" TEXT NOT NULL,
      "companyId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "grade" TEXT,
      "basicSalaryKobo" BIGINT NOT NULL,
      "housingAllowanceKobo" BIGINT NOT NULL DEFAULT 0,
      "transportAllowanceKobo" BIGINT NOT NULL DEFAULT 0,
      "feedingAllowanceKobo" BIGINT NOT NULL DEFAULT 0,
      "medicalAllowanceKobo" BIGINT NOT NULL DEFAULT 0,
      "communicationAllowanceKobo" BIGINT NOT NULL DEFAULT 0,
      "otherTaxableAllowancesKobo" BIGINT NOT NULL DEFAULT 0,
      "nonTaxableReimbursementsKobo" BIGINT NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "SalaryStructure_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "SalaryStructure_companyId_name_key" ON "SalaryStructure"("companyId", "name")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "SalaryStructure_companyId_idx" ON "SalaryStructure"("companyId")`
  );
  await addFk(
    "SalaryStructure",
    "SalaryStructure_companyId_fkey",
    "companyId",
    "Company"
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "SalaryStructure" ADD COLUMN IF NOT EXISTS "grade" TEXT`
  );

  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "salaryStructureId" TEXT`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Employee_salaryStructureId_idx" ON "Employee"("salaryStructureId")`
  );
  await addFk(
    "Employee",
    "Employee_salaryStructureId_fkey",
    "salaryStructureId",
    "SalaryStructure",
    "SET NULL"
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "BenefitPlan" (
      "id" TEXT NOT NULL,
      "companyId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "kind" TEXT NOT NULL DEFAULT 'OTHER',
      "employerCostKobo" BIGINT NOT NULL DEFAULT 0,
      "employeeDeductionKobo" BIGINT NOT NULL DEFAULT 0,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "BenefitPlan_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "BenefitPlan_companyId_name_key" ON "BenefitPlan"("companyId", "name")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "BenefitPlan_companyId_idx" ON "BenefitPlan"("companyId")`
  );
  await addFk("BenefitPlan", "BenefitPlan_companyId_fkey", "companyId", "Company");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "EmployeeBenefit" (
      "id" TEXT NOT NULL,
      "employeeId" TEXT NOT NULL,
      "planId" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "endedAt" TIMESTAMP(3),
      CONSTRAINT "EmployeeBenefit_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "EmployeeBenefit_employeeId_planId_key" ON "EmployeeBenefit"("employeeId", "planId")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "EmployeeBenefit_planId_idx" ON "EmployeeBenefit"("planId")`
  );
  await addFk(
    "EmployeeBenefit",
    "EmployeeBenefit_employeeId_fkey",
    "employeeId",
    "Employee"
  );
  await addFk("EmployeeBenefit", "EmployeeBenefit_planId_fkey", "planId", "BenefitPlan");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "RecurringDeduction" (
      "id" TEXT NOT NULL,
      "companyId" TEXT NOT NULL,
      "employeeId" TEXT NOT NULL,
      "kind" TEXT NOT NULL DEFAULT 'OTHER',
      "amountKobo" BIGINT NOT NULL,
      "description" TEXT,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "RecurringDeduction_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "RecurringDeduction_companyId_status_idx" ON "RecurringDeduction"("companyId", "status")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "RecurringDeduction_employeeId_idx" ON "RecurringDeduction"("employeeId")`
  );
  await addFk(
    "RecurringDeduction",
    "RecurringDeduction_companyId_fkey",
    "companyId",
    "Company"
  );
  await addFk(
    "RecurringDeduction",
    "RecurringDeduction_employeeId_fkey",
    "employeeId",
    "Employee"
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SalaryAdvance" (
      "id" TEXT NOT NULL,
      "companyId" TEXT NOT NULL,
      "employeeId" TEXT NOT NULL,
      "requestedKobo" BIGINT NOT NULL,
      "approvedKobo" BIGINT NOT NULL DEFAULT 0,
      "installments" INTEGER NOT NULL DEFAULT 1,
      "reason" TEXT,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "approvedById" TEXT,
      "approvedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "SalaryAdvance_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "SalaryAdvance_companyId_status_idx" ON "SalaryAdvance"("companyId", "status")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "SalaryAdvance_employeeId_idx" ON "SalaryAdvance"("employeeId")`
  );
  await addFk("SalaryAdvance", "SalaryAdvance_companyId_fkey", "companyId", "Company");
  await addFk(
    "SalaryAdvance",
    "SalaryAdvance_employeeId_fkey",
    "employeeId",
    "Employee"
  );
  await addFk(
    "SalaryAdvance",
    "SalaryAdvance_approvedById_fkey",
    "approvedById",
    "User",
    "SET NULL"
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SalaryAdvanceCharge" (
      "id" TEXT NOT NULL,
      "advanceId" TEXT NOT NULL,
      "payrollRunId" TEXT NOT NULL,
      "amountKobo" BIGINT NOT NULL,
      CONSTRAINT "SalaryAdvanceCharge_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "SalaryAdvanceCharge_advanceId_payrollRunId_key" ON "SalaryAdvanceCharge"("advanceId", "payrollRunId")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "SalaryAdvanceCharge_payrollRunId_idx" ON "SalaryAdvanceCharge"("payrollRunId")`
  );
  await addFk(
    "SalaryAdvanceCharge",
    "SalaryAdvanceCharge_advanceId_fkey",
    "advanceId",
    "SalaryAdvance"
  );
  await addFk(
    "SalaryAdvanceCharge",
    "SalaryAdvanceCharge_payrollRunId_fkey",
    "payrollRunId",
    "PayrollRun"
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SalaryLoan" (
      "id" TEXT NOT NULL,
      "companyId" TEXT NOT NULL,
      "employeeId" TEXT NOT NULL,
      "principalKobo" BIGINT NOT NULL,
      "interestKobo" BIGINT NOT NULL DEFAULT 0,
      "installments" INTEGER NOT NULL DEFAULT 1,
      "reason" TEXT,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "approvedById" TEXT,
      "approvedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "SalaryLoan_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "SalaryLoan_companyId_status_idx" ON "SalaryLoan"("companyId", "status")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "SalaryLoan_employeeId_idx" ON "SalaryLoan"("employeeId")`
  );
  await addFk("SalaryLoan", "SalaryLoan_companyId_fkey", "companyId", "Company");
  await addFk("SalaryLoan", "SalaryLoan_employeeId_fkey", "employeeId", "Employee");
  await addFk(
    "SalaryLoan",
    "SalaryLoan_approvedById_fkey",
    "approvedById",
    "User",
    "SET NULL"
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SalaryLoanCharge" (
      "id" TEXT NOT NULL,
      "loanId" TEXT NOT NULL,
      "payrollRunId" TEXT NOT NULL,
      "amountKobo" BIGINT NOT NULL,
      CONSTRAINT "SalaryLoanCharge_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "SalaryLoanCharge_loanId_payrollRunId_key" ON "SalaryLoanCharge"("loanId", "payrollRunId")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "SalaryLoanCharge_payrollRunId_idx" ON "SalaryLoanCharge"("payrollRunId")`
  );
  await addFk("SalaryLoanCharge", "SalaryLoanCharge_loanId_fkey", "loanId", "SalaryLoan");
  await addFk(
    "SalaryLoanCharge",
    "SalaryLoanCharge_payrollRunId_fkey",
    "payrollRunId",
    "PayrollRun"
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "RemittancePayment" (
      "id" TEXT NOT NULL,
      "companyId" TEXT NOT NULL,
      "payrollRunId" TEXT NOT NULL,
      "kind" TEXT NOT NULL,
      "amountKobo" BIGINT NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "paidAt" TIMESTAMP(3),
      "reference" TEXT,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "RemittancePayment_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "RemittancePayment_payrollRunId_kind_key" ON "RemittancePayment"("payrollRunId", "kind")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "RemittancePayment_companyId_status_idx" ON "RemittancePayment"("companyId", "status")`
  );
  await addFk(
    "RemittancePayment",
    "RemittancePayment_companyId_fkey",
    "companyId",
    "Company"
  );
  await addFk(
    "RemittancePayment",
    "RemittancePayment_payrollRunId_fkey",
    "payrollRunId",
    "PayrollRun"
  );

  ensured = true;
}
