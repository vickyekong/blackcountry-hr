import { prisma } from "@/lib/db";
import { sumRemittances } from "@/lib/reports/remittances";
import { REMITTANCE_KINDS } from "@/lib/payroll/labels";

const SETTLED = new Set([
  "APPROVED",
  "FORWARDED_TO_FINANCE",
  "PROCESSING",
  "PAID",
]);

export async function syncRemittanceRows(options: {
  companyId: string;
  payrollRunId: string;
}) {
  const run = await prisma.payrollRun.findFirst({
    where: { id: options.payrollRunId, companyId: options.companyId },
    include: {
      payslips: {
        select: {
          payeKobo: true,
          pensionEmployeeKobo: true,
          pensionEmployerKobo: true,
          nhfKobo: true,
          nsitfKobo: true,
        },
      },
    },
  });
  if (!run || !SETTLED.has(run.status)) return [];

  const totals = sumRemittances(run.payslips);
  const amounts: Record<(typeof REMITTANCE_KINDS)[number], bigint> = {
    PAYE: totals.paye,
    PENSION: totals.pensionEmployee + totals.pensionEmployer,
    NHF: totals.nhf,
    NSITF: totals.nsitf,
  };

  const rows = [];
  for (const kind of REMITTANCE_KINDS) {
    const row = await prisma.remittancePayment.upsert({
      where: {
        payrollRunId_kind: { payrollRunId: run.id, kind },
      },
      create: {
        companyId: run.companyId,
        payrollRunId: run.id,
        kind,
        amountKobo: amounts[kind],
        status: "PENDING",
      },
      update: {
        amountKobo: amounts[kind],
      },
    });
    rows.push(row);
  }
  return rows;
}
