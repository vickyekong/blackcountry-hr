import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/api-auth";
import { ensureRecruitmentSchema } from "@/lib/ensure-recruitment-schema";
import { applyUrlForListing } from "@/lib/recruitment/boards";
import { getAppBaseUrl } from "@/lib/app-url";

export async function GET() {
  try {
    await ensureRecruitmentSchema();
    const listings = await prisma.jobListing.findMany({
      where: { status: "OPEN" },
      select: {
        id: true,
        title: true,
        department: true,
        location: true,
        employmentType: true,
        company: { select: { name: true } },
      },
      orderBy: { publishedAt: "desc" },
    });
    const origin = getAppBaseUrl();
    return NextResponse.json(
      listings.map((row) => ({
        ...row,
        applyUrl: applyUrlForListing(row.id, origin),
      }))
    );
  } catch (error) {
    return handleApiError(error);
  }
}
