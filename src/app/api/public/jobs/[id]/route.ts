import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/api-auth";
import { ensureRecruitmentSchema } from "@/lib/ensure-recruitment-schema";
import { clientIp, consumeRateLimit } from "@/lib/rate-limit";
import { JOB_BOARDS } from "@/lib/recruitment/boards";
import { notifyUsersInRoles } from "@/lib/notifications";
import { getAppBaseUrl } from "@/lib/app-url";

const applySchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().max(40).optional().nullable(),
  resumeUrl: z.string().trim().url().max(500).optional().nullable(),
  coverLetter: z.string().trim().max(4000).optional().nullable(),
  source: z.enum(JOB_BOARDS).default("CAREERS_PAGE"),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await ensureRecruitmentSchema();
    const listing = await prisma.jobListing.findFirst({
      where: { id: params.id, status: "OPEN" },
      select: {
        id: true,
        title: true,
        department: true,
        location: true,
        employmentType: true,
        description: true,
        requirements: true,
        company: { select: { name: true, logoUrl: true } },
      },
    });
    if (!listing) {
      return NextResponse.json({ error: "This listing is not open" }, { status: 404 });
    }
    await prisma.jobListing.update({
      where: { id: listing.id },
      data: { viewCount: { increment: 1 } },
    });
    return NextResponse.json(listing);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await ensureRecruitmentSchema();
    const ip = clientIp(req);
    if (!consumeRateLimit(`job-apply:${ip}`, 8, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many applications from this network. Try again later." },
        { status: 429 }
      );
    }
    const listing = await prisma.jobListing.findFirst({
      where: { id: params.id, status: "OPEN" },
      select: { id: true, companyId: true },
    });
    if (!listing) {
      return NextResponse.json({ error: "This listing is not open" }, { status: 404 });
    }
    const body = applySchema.parse(await req.json());
    const existing = await prisma.jobApplication.findFirst({
      where: {
        listingId: listing.id,
        email: body.email.toLowerCase(),
      },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "You have already applied for this role with that email." },
        { status: 409 }
      );
    }
    const application = await prisma.jobApplication.create({
      data: {
        companyId: listing.companyId,
        listingId: listing.id,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email.toLowerCase(),
        phone: body.phone || null,
        resumeUrl: body.resumeUrl || null,
        coverLetter: body.coverLetter || null,
        source: body.source,
      },
    });
    const listingTitle = await prisma.jobListing.findUnique({
      where: { id: listing.id },
      select: { title: true },
    });
    await notifyUsersInRoles({
      companyId: listing.companyId,
      roles: ["HR_ADMIN", "SUPER_ADMIN"],
      type: "RECRUITMENT",
      title: `New application — ${listingTitle?.title ?? "role"}`,
      body: `${body.firstName} ${body.lastName} applied.`,
      linkUrl: `${getAppBaseUrl()}/recruitment/${listing.id}`,
      entityType: "JobApplication",
      entityId: application.id,
    });
    return NextResponse.json(
      { id: application.id, message: "Application received." },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
