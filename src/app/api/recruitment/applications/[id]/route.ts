import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseOptionalDate } from "@/lib/people/dates";
import { prisma } from "@/lib/db";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { ensureRecruitmentSchema } from "@/lib/ensure-recruitment-schema";
import { APPLICATION_STATUSES } from "@/lib/talent/labels";

const patchSchema = z.object({
  status: z.enum(APPLICATION_STATUSES).optional(),
  hiredEmployeeId: z.string().optional().nullable(),
  notes: z.string().trim().max(4000).optional().nullable(),
  interviewAt: z.string().nullable().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("manageRecruitment");
    await ensureRecruitmentSchema();
    const application = await prisma.jobApplication.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            department: true,
            employmentType: true,
          },
        },
      },
    });
    if (!application) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(application);
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
    const application = await prisma.jobApplication.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    });
    if (!application) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (body.hiredEmployeeId) {
      const employee = await prisma.employee.findFirst({
        where: { id: body.hiredEmployeeId, companyId: session.user.companyId },
        select: { id: true },
      });
      if (!employee) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 });
      }
    }

    const updated = await prisma.jobApplication.update({
      where: { id: application.id },
      data: {
        status: body.status,
        notes: body.notes === undefined ? undefined : body.notes,
        interviewAt:
          body.interviewAt !== undefined
            ? parseOptionalDate(body.interviewAt)
            : undefined,
        hiredEmployeeId:
          body.hiredEmployeeId === undefined
            ? undefined
            : body.hiredEmployeeId,
      },
    });

    if (body.status === "HIRED") {
      const listing = await prisma.jobListing.findUnique({
        where: { id: application.listingId },
        select: { openings: true },
      });
      const hiredCount = await prisma.jobApplication.count({
        where: { listingId: application.listingId, status: "HIRED" },
      });
      if (hiredCount >= (listing?.openings ?? 1)) {
        await prisma.jobListing.update({
          where: { id: application.listingId },
          data: { status: "FILLED", closedAt: new Date() },
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
