import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-auth";
import { assertCronRequest } from "@/lib/automation/cron-auth";
import { runJobsForAllCompanies } from "@/lib/automation/jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  req: Request,
  { params }: { params: { job: string } }
) {
  try {
    assertCronRequest(req);
    const { ensureGroupSchema } = await import("@/lib/ensure-group-schema");
    await ensureGroupSchema();
    const job = params.job;
    if (job !== "daily" && job !== "weekly" && job !== "monthly") {
      return NextResponse.json({ error: "Unknown job" }, { status: 404 });
    }
    const result = await runJobsForAllCompanies(job);
    return NextResponse.json({ ok: true, job, ...result });
  } catch (error) {
    return handleApiError(error);
  }
}
