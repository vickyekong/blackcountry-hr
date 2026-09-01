import { prisma } from "@/lib/db";

let ensured = false;

/** Idempotent: staff portal columns + GENERAL change-request type. */
export async function ensureStaffPortalSchema() {
  if (ensured) return;
  await prisma.$executeRawUnsafe(
    `ALTER TYPE "ChangeRequestType" ADD VALUE IF NOT EXISTS 'GENERAL'`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "workEmail" TEXT`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "phone" TEXT`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "addressLine" TEXT`
  );
  ensured = true;
}
