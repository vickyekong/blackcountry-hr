import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { ensureRecruitmentSchema } from "@/lib/ensure-recruitment-schema";

const patchSchema = z.object({
  status: z
    .enum(["NEW", "REVIEWING", "SHORTLISTED", "REJECTED", "HIRED"])
    .optional(),
  hiredEmployeeId: z.string().optional().nullable(),
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
        hiredEmployeeId:
          body.hiredEmployeeId === undefined
            ? undefined
            : body.hiredEmployeeId,
      },
    });

    if (body.status === "HIRED") {
      await prisma.jobListing.update({
        where: { id: application.listingId },
        data: { status: "FILLED", closedAt: new Date() },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
