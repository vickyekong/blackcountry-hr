import { NextResponse } from "next/server";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { loadWorkforceAnalytics } from "@/lib/reports/load-analytics";

export async function GET(req: Request) {
  try {
    const session = await requirePermission("viewReports");
    const { searchParams } = new URL(req.url);
    const year =
      parseInt(searchParams.get("year") ?? "", 10) || new Date().getFullYear();
    const data = await loadWorkforceAnalytics(session.user.companyId, year);
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
