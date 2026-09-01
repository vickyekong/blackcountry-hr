import { NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api-auth";
import { listAccessibleCompanies } from "@/lib/tenancy/workspace";

export async function GET() {
  try {
    const session = await requireAuth();
    const companies = await listAccessibleCompanies(
      session.user.homeCompanyId,
      session.user.role
    );
    return NextResponse.json({
      homeCompanyId: session.user.homeCompanyId,
      activeCompanyId: session.user.companyId,
      companies,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
