import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { ensureRecruitmentSchema } from "@/lib/ensure-recruitment-schema";
import { getAppBaseUrl } from "@/lib/app-url";
import { applyUrlForListing } from "@/lib/recruitment/boards";
import { parseOptionalDate } from "@/lib/people/dates";
import { nairaToKobo } from "@/lib/money";
import { serializeBigInts } from "@/lib/payroll/config-mapper";

const createSchema = z.object({
  title: z.string().trim().min(2).max(160),
  department: z.string().trim().min(1).max(120),
  location: z.string().trim().min(1).max(160).default("Nigeria"),
  employmentType: z.enum(["FULL_TIME", "CONTRACT"]).default("FULL_TIME"),
  description: z.string().trim().min(10).max(8000),
  requirements: z.string().trim().max(4000).optional().nullable(),
  openings: z.number().int().min(1).max(50).optional(),
  deadline: z.string().nullable().optional(),
  salaryMinNaira: z.number().min(0).optional().nullable(),
  salaryMaxNaira: z.number().min(0).optional().nullable(),
  skillIds: z.array(z.string()).optional(),
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
      serializeBigInts(
        listings.map((row) => ({
          ...row,
          applyUrl: applyUrlForListing(row.id, origin),
          applicationCount: row._count.applications,
        }))
      )
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
        openings: body.openings ?? 1,
        deadline: parseOptionalDate(body.deadline ?? undefined) ?? null,
        salaryMinKobo:
          body.salaryMinNaira != null ? nairaToKobo(body.salaryMinNaira) : null,
        salaryMaxKobo:
          body.salaryMaxNaira != null ? nairaToKobo(body.salaryMaxNaira) : null,
        status: body.status,
        createdById: session.user.id,
        publishedAt: open ? new Date() : null,
      },
    });
    if (body.skillIds?.length) {
      await prisma.jobListingSkill.createMany({
        data: body.skillIds.map((skillId) => ({
          listingId: listing.id,
          skillId,
        })),
        skipDuplicates: true,
      });
    }
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
      serializeBigInts({
        ...listing,
        applyUrl: applyUrlForListing(listing.id, getAppBaseUrl()),
      }),
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
