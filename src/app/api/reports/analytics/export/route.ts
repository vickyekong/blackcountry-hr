import { requirePermission, handleApiError } from "@/lib/api-auth";
import { loadWorkforceAnalytics } from "@/lib/reports/load-analytics";
import { buildCsv, csvResponse, formatNairaFromKobo } from "@/lib/reports/csv";
import { getMonthName } from "@/lib/utils";

export async function GET(req: Request) {
  try {
    const session = await requirePermission("viewReports");
    const { searchParams } = new URL(req.url);
    const year =
      parseInt(searchParams.get("year") ?? "", 10) || new Date().getFullYear();
    const kind = searchParams.get("kind") ?? "people";
    const data = await loadWorkforceAnalytics(session.user.companyId, year);

    if (kind === "payroll") {
      const csv = buildCsv(
        [
          "Month",
          "Headcount",
          "Gross",
          "Net",
          "PAYE",
          "Pension employee",
          "Pension employer",
          "NHF",
          "NSITF",
          "Employer cost",
        ],
        data.costs.trend.map((row) => [
          `${getMonthName(row.month)} ${row.year}`,
          row.headcount,
          formatNairaFromKobo(BigInt(row.grossPayKobo)),
          formatNairaFromKobo(BigInt(row.netPayKobo)),
          formatNairaFromKobo(BigInt(row.payeKobo)),
          formatNairaFromKobo(BigInt(row.pensionEmployeeKobo)),
          formatNairaFromKobo(BigInt(row.pensionEmployerKobo)),
          formatNairaFromKobo(BigInt(row.nhfKobo)),
          formatNairaFromKobo(BigInt(row.nsitfKobo)),
          formatNairaFromKobo(BigInt(row.employerCostKobo)),
        ])
      );
      return csvResponse(csv, `payroll-analytics-${year}.csv`);
    }

    if (kind === "time") {
      const csv = buildCsv(
        ["Department", "Approved hours"],
        data.time.hoursByDepartment.map((row) => [row.department, row.hours])
      );
      return csvResponse(csv, `time-analytics-${year}.csv`);
    }

    const csv = buildCsv(
      [
        "Department",
        "Headcount",
        "Hires",
        "Exits",
        "Turnover %",
      ],
      data.people.byDepartment.map((row) => [
        row.department,
        row.headcount,
        row.hires,
        row.exits,
        row.turnoverPercent ?? "",
      ])
    );
    return csvResponse(csv, `people-analytics-${year}.csv`);
  } catch (error) {
    return handleApiError(error);
  }
}
