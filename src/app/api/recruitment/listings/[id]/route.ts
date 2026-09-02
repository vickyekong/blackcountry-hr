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
import { parseOptionalDate } from "@/lib/people/dates";
import { nairaToKobo } from "@/lib/money";
import { serializeBigInts } from "@/lib/payroll/config-mapper";
import { skillMatchPercent } from "@/lib/talent/skill-match";

const patchSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  department: z.string().trim().min(1).max(120).optional(),
  location: z.string().trim().min(1).max(160).optional(),
  employmentType: z.enum(["FULL_TIME", "CONTRACT"]).optional(),
  description: z.string().trim().min(10).max(8000).optional(),
  requirements: z.string().trim().max(4000).optional().nullable(),
  openings: z.number().int().min(1).max(50).optional(),
  deadline: z.string().nullable().optional(),
  salaryMinNaira: z.number().min(0).optional().nullable(),
  salaryMaxNaira: z.number().min(0).optional().nullable(),
  skillIds: z.array(z.string()).optional(),
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
        requiredSkills: { include: { skill: { select: { id: true, name: true } } } },
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
    const requiredNames = listing.requiredSkills.map((row) => row.skill.name);
    const applications = listing.applications.map((app) => {
      const match = skillMatchPercent(
        requiredNames,
        `${app.coverLetter ?? ""} ${app.resumeUrl ?? ""} ${app.notes ?? ""}`
      );
      return { ...app, skillMatch: match };
    });
    const performance = listingPerformance({
      viewCount: listing.viewCount,
      applicationCount: listing._count.applications,
    });
    return NextResponse.json(
      serializeBigInts({
        ...listing,
        applications,
        requiredSkills: listing.requiredSkills.map((row) => ({
          id: row.skill.id,
          name: row.skill.name,
        })),
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
      })
    );
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
        openings: body.openings,
        deadline:
          body.deadline !== undefined
            ? parseOptionalDate(body.deadline)
            : undefined,
        salaryMinKobo:
          body.salaryMinNaira === undefined
            ? undefined
            : body.salaryMinNaira == null
              ? null
              : nairaToKobo(body.salaryMinNaira),
        salaryMaxKobo:
          body.salaryMaxNaira === undefined
            ? undefined
            : body.salaryMaxNaira == null
              ? null
              : nairaToKobo(body.salaryMaxNaira),
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
    if (body.skillIds) {
      await prisma.jobListingSkill.deleteMany({
        where: { listingId: listing.id },
      });
      if (body.skillIds.length > 0) {
        await prisma.jobListingSkill.createMany({
          data: body.skillIds.map((skillId) => ({
            listingId: listing.id,
            skillId,
          })),
        });
      }
    }
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
    return NextResponse.json(serializeBigInts(listing));
  } catch (error) {
    return handleApiError(error);
  }
}
