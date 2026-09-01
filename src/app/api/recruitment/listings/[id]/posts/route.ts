import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { ensureRecruitmentSchema } from "@/lib/ensure-recruitment-schema";
import { getAppBaseUrl } from "@/lib/app-url";
import {
  applyUrlForListing,
  boardSharePayload,
  JOB_BOARDS,
  JOB_BOARD_LABELS,
} from "@/lib/recruitment/boards";

const postSchema = z.object({
  board: z.enum(JOB_BOARDS),
  externalUrl: z.string().trim().url().max(500).optional().nullable(),
  markPosted: z.boolean().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("manageRecruitment");
    await ensureRecruitmentSchema();
    const body = postSchema.parse(await req.json());
    const listing = await prisma.jobListing.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
      include: { company: { select: { name: true } } },
    });
    if (!listing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (listing.status !== "OPEN") {
      return NextResponse.json(
        { error: "Open the listing before posting it to boards." },
        { status: 400 }
      );
    }

    const applyUrl = applyUrlForListing(listing.id, getAppBaseUrl());
    const share = boardSharePayload({
      board: body.board,
      applyUrl,
      title: listing.title,
      companyName: listing.company.name,
      location: listing.location,
      description: listing.description,
    });

    const markPosted = body.markPosted !== false;
    const post = await prisma.jobListingPost.upsert({
      where: {
        listingId_board: { listingId: listing.id, board: body.board },
      },
      create: {
        listingId: listing.id,
        board: body.board,
        status: markPosted ? "POSTED" : "READY",
        postedAt: markPosted ? new Date() : null,
        externalUrl: body.externalUrl || share.url,
      },
      update: {
        status: markPosted ? "POSTED" : "READY",
        postedAt: markPosted ? new Date() : null,
        externalUrl: body.externalUrl || share.url,
        lastError: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        companyId: session.user.companyId,
        action: "SYNC",
        entityType: "JobListing",
        entityId: listing.id,
        performedById: session.user.id,
        changes: { board: body.board, status: post.status },
      },
    });

    return NextResponse.json({
      post,
      applyUrl,
      boardLabel: JOB_BOARD_LABELS[body.board],
      share,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
