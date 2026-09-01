import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { ensureRecruitmentSchema } from "@/lib/ensure-recruitment-schema";
import { getAppBaseUrl } from "@/lib/app-url";
import { applyUrlForListing } from "@/lib/recruitment/boards";

const createSchema = z.object({
  title: z.string().trim().min(2).max(160),
  department: z.string().trim().min(1).max(120),
  location: z.string().trim().min(1).max(160).default("Nigeria"),
  employmentType: z.enum(["FULL_TIME", "CONTRACT"]).default("FULL_TIME"),
  description: z.string().trim().min(10).max(8000),
  requirements: z.string().trim().max(4000).optional().nullable(),
  status: z.enum(["DRAFT", "OPEN"]).default("DRAFT"),
});

export async function GET() {
  try {
    const session = await requirePermission("manageRecruitment");
    await ensureRecruitmentSchema();
    const listings = await prisma.jobListing.findMany({
      where: { companyId: session.user.companyId },
      include: {
        _count: { select: { applications: true } },
        posts: { select: { board: true, status: true, postedAt: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    const origin = getAppBaseUrl();
    return NextResponse.json(
      listings.map((row) => ({
        ...row,
        applyUrl: applyUrlForListing(row.id, origin),
        applicationCount: row._count.applications,
      }))
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("manageRecruitment");
    await ensureRecruitmentSchema();
    const body = createSchema.parse(await req.json());
    const open = body.status === "OPEN";
    const listing = await prisma.jobListing.create({
      data: {
        companyId: session.user.companyId,
        title: body.title,
        department: body.department,
        location: body.location,
        employmentType: body.employmentType,
        description: body.description,
        requirements: body.requirements || null,
        status: body.status,
        createdById: session.user.id,
        publishedAt: open ? new Date() : null,
      },
    });
    if (open) {
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
        update: {
          status: "POSTED",
          postedAt: new Date(),
        },
      });
    }
    await prisma.auditLog.create({
      data: {
        companyId: session.user.companyId,
        action: "CREATE",
        entityType: "JobListing",
        entityId: listing.id,
        performedById: session.user.id,
        changes: { title: listing.title, status: listing.status },
      },
    });
    return NextResponse.json(
      {
        ...listing,
        applyUrl: applyUrlForListing(listing.id, getAppBaseUrl()),
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
