import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { ensureRecruitmentSchema } from "@/lib/ensure-recruitment-schema";
import { getAppBaseUrl } from "@/lib/app-url";
import {
  applyUrlForListing,
  JOB_BOARD_LABELS,
  listingPerformance,
} from "@/lib/recruitment/boards";

const patchSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  department: z.string().trim().min(1).max(120).optional(),
  location: z.string().trim().min(1).max(160).optional(),
  employmentType: z.enum(["FULL_TIME", "CONTRACT"]).optional(),
  description: z.string().trim().min(10).max(8000).optional(),
  requirements: z.string().trim().max(4000).optional().nullable(),
  status: z.enum(["DRAFT", "OPEN", "CLOSED", "FILLED"]).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("manageRecruitment");
    await ensureRecruitmentSchema();
    const listing = await prisma.jobListing.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
      include: {
        posts: { orderBy: { board: "asc" } },
        applications: { orderBy: { createdAt: "desc" } },
        _count: { select: { applications: true } },
      },
    });
    if (!listing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const origin = getAppBaseUrl();
    const bySource = new Map<string, number>();
    const byStatus = new Map<string, number>();
    for (const app of listing.applications) {
      bySource.set(app.source, (bySource.get(app.source) ?? 0) + 1);
      byStatus.set(app.status, (byStatus.get(app.status) ?? 0) + 1);
    }
    const performance = listingPerformance({
      viewCount: listing.viewCount,
      applicationCount: listing._count.applications,
    });
    return NextResponse.json({
      ...listing,
      applyUrl: applyUrlForListing(listing.id, origin),
      applicationCount: listing._count.applications,
      performance,
      bySource: [...bySource.entries()].map(([source, count]) => ({
        source,
        label: JOB_BOARD_LABELS[source as keyof typeof JOB_BOARD_LABELS] ?? source,
        count,
      })),
      byStatus: [...byStatus.entries()].map(([status, count]) => ({
        status,
        count,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("manageRecruitment");
    await ensureRecruitmentSchema();
    const body = patchSchema.parse(await req.json());
    const existing = await prisma.jobListing.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const nextStatus = body.status ?? existing.status;
    const listing = await prisma.jobListing.update({
      where: { id: existing.id },
      data: {
        title: body.title,
        department: body.department,
        location: body.location,
        employmentType: body.employmentType,
        description: body.description,
        requirements:
          body.requirements === undefined ? undefined : body.requirements,
        status: nextStatus,
        publishedAt:
          nextStatus === "OPEN" && !existing.publishedAt
            ? new Date()
            : existing.publishedAt,
        closedAt:
          nextStatus === "CLOSED" || nextStatus === "FILLED"
            ? existing.closedAt ?? new Date()
            : null,
      },
    });
    if (nextStatus === "OPEN") {
      await prisma.jobListingPost.upsert({
        where: {
          listingId_board: { listingId: listing.id, board: "CAREERS_PAGE" },
        },
        create: {
          listingId: listing.id,
          board: "CAREERS_PAGE",
          status: "POSTED",
          postedAt: new Date(),
          externalUrl: applyUrlForListing(listing.id, getAppBaseUrl()),
        },
        update: { status: "POSTED", postedAt: new Date() },
      });
    }
    await prisma.auditLog.create({
      data: {
        companyId: session.user.companyId,
        action: "UPDATE",
        entityType: "JobListing",
        entityId: listing.id,
        performedById: session.user.id,
        changes: body,
      },
    });
    return NextResponse.json(listing);
  } catch (error) {
    return handleApiError(error);
  }
}
