import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { REVIEW_STATUSES } from "@/lib/talent/labels";
import { z } from "zod";

const goalSchema = z.object({
  title: z.string().trim().min(1).max(160),
  target: z.string().trim().min(1).max(160),
  actual: z.string().trim().max(160).optional(),
  weight: z.number().int().min(1).max(100).optional(),
  periodYear: z.number().int().min(2020).max(2100).optional(),
  periodLabel: z.string().trim().max(20).optional(),
});

const reviewSchema = z.object({
  periodYear: z.number().int().min(2020).max(2100).optional(),
  periodLabel: z.string().trim().max(20).optional(),
  status: z.enum(REVIEW_STATUSES).optional(),
  selfNotes: z.string().trim().max(4000).optional().nullable(),
  managerNotes: z.string().trim().max(4000).optional().nullable(),
  selfScore: z.number().int().min(1).max(5).optional().nullable(),
  managerScore: z.number().int().min(1).max(5).optional().nullable(),
});

async function loadEmployee(companyId: string, employeeId: string) {
  return prisma.employee.findFirst({
    where: { id: employeeId, companyId },
    select: { id: true },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("viewEmployees");
    const employee = await loadEmployee(session.user.companyId, params.id);
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    const year = new Date().getFullYear();
    const [goals, reviews] = await Promise.all([
      prisma.performanceGoal.findMany({
        where: { employeeId: params.id },
        orderBy: [{ periodYear: "desc" }, { createdAt: "desc" }],
      }),
      prisma.performanceReview.findMany({
        where: { employeeId: params.id },
        orderBy: [{ periodYear: "desc" }, { periodLabel: "asc" }],
      }),
    ]);
    return NextResponse.json({ year, goals, reviews });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("manageEmployees");
    const employee = await loadEmployee(session.user.companyId, params.id);
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    const body = await req.json();
    if (body.kind === "review") {
      const data = reviewSchema.parse(body);
      const periodYear = data.periodYear ?? new Date().getFullYear();
      const periodLabel = data.periodLabel ?? "ANNUAL";
      const review = await prisma.performanceReview.upsert({
        where: {
          employeeId_periodYear_periodLabel: {
            employeeId: params.id,
            periodYear,
            periodLabel,
          },
        },
        create: {
          companyId: session.user.companyId,
          employeeId: params.id,
          periodYear,
          periodLabel,
          status: data.status ?? "DRAFT",
          selfNotes: data.selfNotes,
          managerNotes: data.managerNotes,
          selfScore: data.selfScore,
          managerScore: data.managerScore,
        },
        update: {
          status: data.status,
          selfNotes: data.selfNotes,
          managerNotes: data.managerNotes,
          selfScore: data.selfScore,
          managerScore: data.managerScore,
        },
      });
      return NextResponse.json(review, { status: 201 });
    }
    const data = goalSchema.parse(body);
    const goal = await prisma.performanceGoal.create({
      data: {
        companyId: session.user.companyId,
        employeeId: params.id,
        title: data.title,
        target: data.target,
        actual: data.actual ?? "",
        weight: data.weight ?? 100,
        periodYear: data.periodYear ?? new Date().getFullYear(),
        periodLabel: data.periodLabel ?? "ANNUAL",
      },
    });
    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
