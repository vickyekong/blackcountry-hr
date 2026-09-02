import { prisma } from "@/lib/db";
import { ensureTimeSchema } from "@/lib/ensure-time-schema";
import { localDateKey } from "@/lib/time/dates";

export async function companyHolidayKeys(
  companyId: string,
  from?: Date,
  to?: Date
): Promise<Set<string>> {
  await ensureTimeSchema();
  const rows = await prisma.companyHoliday.findMany({
    where: {
      companyId,
      ...(from && to ? { workDate: { gte: from, lte: to } } : {}),
    },
    select: { workDate: true },
  });
  return new Set(rows.map((row) => localDateKey(row.workDate)));
}
