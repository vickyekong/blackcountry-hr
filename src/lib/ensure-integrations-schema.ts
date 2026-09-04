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

/** Idempotent: outbound webhook endpoints. Does not replace Google/Microsoft OAuth. */
export async function ensureIntegrationsSchema() {
  if (ensured) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "WebhookEndpoint" (
      "id" TEXT NOT NULL,
      "companyId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "url" TEXT NOT NULL,
      "secret" TEXT NOT NULL,
      "events" JSONB,
      "enabled" BOOLEAN NOT NULL DEFAULT true,
      "lastStatus" INTEGER,
      "lastError" TEXT NOT NULL DEFAULT '',
      "lastFiredAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "WebhookEndpoint_companyId_enabled_idx" ON "WebhookEndpoint"("companyId", "enabled")`
  );
  await addFk(
    "WebhookEndpoint",
    "WebhookEndpoint_companyId_fkey",
    "companyId",
    "Company"
  );

  ensured = true;
}
