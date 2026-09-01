import { prisma } from "@/lib/db";

let ensured = false;

/**
 * Prisma talks as the database owner (bypasses RLS). PostgREST `anon` /
 * `authenticated` must not read people or pay data. Idempotent.
 */
export async function ensureAppRls() {
  if (ensured) return;

  try {
    await prisma.$executeRawUnsafe(`
    DO $$
    DECLARE
      r RECORD;
    BEGIN
      FOR r IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
      LOOP
        EXECUTE format(
          'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
          r.tablename
        );
      END LOOP;

      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        FOR r IN
          SELECT tablename
          FROM pg_tables
          WHERE schemaname = 'public'
        LOOP
          EXECUTE format(
            'REVOKE ALL ON TABLE public.%I FROM anon',
            r.tablename
          );
        END LOOP;
      END IF;

      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        FOR r IN
          SELECT tablename
          FROM pg_tables
          WHERE schemaname = 'public'
        LOOP
          EXECUTE format(
            'REVOKE ALL ON TABLE public.%I FROM authenticated',
            r.tablename
          );
        END LOOP;
      END IF;
    END $$;
  `);
    ensured = true;
  } catch (err) {
    console.error("ensureAppRls:", err);
  }
}
