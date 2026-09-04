import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requireStaffEmployee } from "@/lib/api-auth";
import { ensurePerformanceSchema } from "@/lib/ensure-performance-schema";
import {
  enrichGoal,
  metricFieldsFromText,
  parseMetric,
  suggestedFinalScore,
  weightedAchievement,
} from "@/lib/performance/kpis";
import { REVIEW_PERIODS } from "@/lib/performance/labels";
import { goalsWhereForEmployee } from "@/lib/performance/scope";
import { employeeFullName } from "@/lib/utils";

const goalSchema = z.object({
  kind: z.literal("goal").optional(),
  title: z.string().trim().min(1).max(160),
  target: z.string().trim().min(1).max(160),
  actual: z.string().trim().max(160).optional(),
  weight: z.number().int().min(1).max(100).optional(),
  periodYear: z.number().int().min(2020).max(2100).optional(),
  periodLabel: z.enum(REVIEW_PERIODS).optional(),
});

const reviewSchema = z.object({
  kind: z.literal("review"),
  periodYear: z.number().int().min(2020).max(2100).optional(),
  periodLabel: z.enum(REVIEW_PERIODS).optional(),
  selfNotes: z.string().trim().max(4000).optional().nullable(),
  selfScore: z.number().int().min(1).max(5).optional().nullable(),
  status: z.enum(["DRAFT", "SUBMITTED"]).optional(),
});

const actualSchema = z.object({
  kind: z.literal("actual"),
  goalId: z.string().min(1),
  actual: z.string().trim().max(160),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireStaffEmployee();
    await ensurePerformanceSchema();
    const employee = await prisma.employee.findFirst({
      where: { id: session.employeeId, companyId: session.user.companyId },
      select: { id: true, department: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    const year =
      Number(req.nextUrl.searchParams.get("year")) || new Date().getFullYear();
    const [goals, reviews, recognitions] = await Promise.all([
      prisma.performanceGoal.findMany({
        where: goalsWhereForEmployee(
          session.user.companyId,
          employee,
          year
        ),
        orderBy: [{ scope: "asc" }, { createdAt: "desc" }],
      }),
      prisma.performanceReview.findMany({
        where: { employeeId: employee.id, periodYear: year },
        include: {
          peerEmployee: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: [{ periodLabel: "asc" }],
      }),
      prisma.recognition.findMany({
        where: { employeeId: employee.id, companyId: session.user.companyId },
        include: { givenBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 40,
      }),
    ]);
    return NextResponse.json({
      year,
      kpi: { weightedAchievement: weightedAchievement(goals) },
      goals: goals.map(enrichGoal),
      reviews: reviews.map((row) => ({
        ...row,
        peerName: row.peerEmployee
          ? employeeFullName(
              row.peerEmployee.firstName,
              row.peerEmployee.lastName
            )
          : null,
        suggestedFinalScore: suggestedFinalScore([
          row.selfScore,
          row.managerScore,
          row.peerScore,
        ]),
      })),
      recognitions: recognitions.map((row) => ({
        ...row,
        givenByName: row.givenBy.name,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireStaffEmployee();
    await ensurePerformanceSchema();
    const body = await req.json();
    if (body.kind === "review") {
      const data = reviewSchema.parse(body);
      const periodYear = data.periodYear ?? new Date().getFullYear();
      const periodLabel = data.periodLabel ?? "ANNUAL";
      const existing = await prisma.performanceReview.findUnique({
        where: {
          employeeId_periodYear_periodLabel: {
            employeeId: session.employeeId,
            periodYear,
            periodLabel,
          },
        },
      });
      if (existing?.status === "COMPLETED") {
        return NextResponse.json(
          { error: "This review is closed. Ask HR if you need a change." },
          { status: 400 }
        );
      }
      const review = await prisma.performanceReview.upsert({
        where: {
          employeeId_periodYear_periodLabel: {
            employeeId: session.employeeId,
            periodYear,
            periodLabel,
          },
        },
        create: {
          companyId: session.user.companyId,
          employeeId: session.employeeId,
          periodYear,
          periodLabel,
          status: data.status ?? "SUBMITTED",
          selfNotes: data.selfNotes,
          selfScore: data.selfScore,
        },
        update: {
          status: data.status ?? "SUBMITTED",
          selfNotes: data.selfNotes,
          selfScore: data.selfScore,
        },
      });
      return NextResponse.json(review, { status: 201 });
    }
    if (body.kind === "actual") {
      const data = actualSchema.parse(body);
      const existing = await prisma.performanceGoal.findFirst({
        where: {
          id: data.goalId,
          employeeId: session.employeeId,
          companyId: session.user.companyId,
          scope: "INDIVIDUAL",
        },
      });
      if (!existing) {
        return NextResponse.json(
          { error: "You can only update actuals on your own goals" },
          { status: 404 }
        );
      }
      const goal = await prisma.performanceGoal.update({
        where: { id: existing.id },
        data: {
          actual: data.actual,
          actualValue: parseMetric(data.actual),
        },
      });
      return NextResponse.json(enrichGoal(goal));
    }
    const data = goalSchema.parse(body);
    const metrics = metricFieldsFromText(data.target, data.actual ?? "");
    const goal = await prisma.performanceGoal.create({
      data: {
        companyId: session.user.companyId,
        employeeId: session.employeeId,
        scope: "INDIVIDUAL",
        title: data.title,
        weight: data.weight ?? 100,
        periodYear: data.periodYear ?? new Date().getFullYear(),
        periodLabel: data.periodLabel ?? "ANNUAL",
        ...metrics,
      },
    });
    return NextResponse.json(enrichGoal(goal), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
