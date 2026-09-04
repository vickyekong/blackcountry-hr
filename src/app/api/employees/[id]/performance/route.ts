import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { ensurePerformanceSchema } from "@/lib/ensure-performance-schema";
import { REVIEW_STATUSES } from "@/lib/talent/labels";
import {
  enrichGoal,
  metricFieldsFromText,
  suggestedFinalScore,
  weightedAchievement,
} from "@/lib/performance/kpis";
import { REVIEW_PERIODS } from "@/lib/performance/labels";
import { goalsWhereForEmployee } from "@/lib/performance/scope";
import { employeeFullName } from "@/lib/utils";
import { z } from "zod";

const goalSchema = z.object({
  title: z.string().trim().min(1).max(160),
  target: z.string().trim().min(1).max(160),
  actual: z.string().trim().max(160).optional(),
  unit: z.string().trim().max(40).optional().nullable(),
  weight: z.number().int().min(1).max(100).optional(),
  periodYear: z.number().int().min(2020).max(2100).optional(),
  periodLabel: z.enum(REVIEW_PERIODS).optional(),
});

const reviewSchema = z.object({
  periodYear: z.number().int().min(2020).max(2100).optional(),
  periodLabel: z.enum(REVIEW_PERIODS).optional(),
  status: z.enum(REVIEW_STATUSES).optional(),
  selfNotes: z.string().trim().max(4000).optional().nullable(),
  managerNotes: z.string().trim().max(4000).optional().nullable(),
  peerNotes: z.string().trim().max(4000).optional().nullable(),
  finalNotes: z.string().trim().max(4000).optional().nullable(),
  selfScore: z.number().int().min(1).max(5).optional().nullable(),
  managerScore: z.number().int().min(1).max(5).optional().nullable(),
  peerScore: z.number().int().min(1).max(5).optional().nullable(),
  finalScore: z.number().int().min(1).max(5).optional().nullable(),
  peerEmployeeId: z.string().optional().nullable(),
});

async function loadEmployee(companyId: string, employeeId: string) {
  return prisma.employee.findFirst({
    where: { id: employeeId, companyId },
    select: { id: true, department: true },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("viewEmployees");
    await ensurePerformanceSchema();
    const employee = await loadEmployee(session.user.companyId, params.id);
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    const year =
      Number(req.nextUrl.searchParams.get("year")) || new Date().getFullYear();
    const [goals, reviews, recognitions, staff] = await Promise.all([
      prisma.performanceGoal.findMany({
        where: goalsWhereForEmployee(
          session.user.companyId,
          employee,
          year
        ),
        orderBy: [{ scope: "asc" }, { createdAt: "desc" }],
      }),
      prisma.performanceReview.findMany({
        where: { employeeId: params.id, periodYear: year },
        include: {
          peerEmployee: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: [{ periodLabel: "asc" }],
      }),
      prisma.recognition.findMany({
        where: { employeeId: params.id, companyId: session.user.companyId },
        include: { givenBy: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 40,
      }),
      prisma.employee.findMany({
        where: {
          companyId: session.user.companyId,
          status: { notIn: ["FIRED", "RESIGNED"] },
        },
        select: { id: true, firstName: true, lastName: true },
        orderBy: { firstName: "asc" },
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
      peers: staff
        .filter((row) => row.id !== params.id)
        .map((row) => ({
          id: row.id,
          name: employeeFullName(row.firstName, row.lastName),
        })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("viewEmployees");
    await ensurePerformanceSchema();
    const employee = await loadEmployee(session.user.companyId, params.id);
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    const body = await req.json();
    if (body.kind === "review") {
      const data = reviewSchema.parse(body);
      const periodYear = data.periodYear ?? new Date().getFullYear();
      const periodLabel = data.periodLabel ?? "ANNUAL";
      if (data.peerEmployeeId) {
        const peer = await prisma.employee.findFirst({
          where: {
            id: data.peerEmployeeId,
            companyId: session.user.companyId,
          },
          select: { id: true },
        });
        if (!peer) {
          return NextResponse.json(
            { error: "Peer not found" },
            { status: 404 }
          );
        }
      }
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
          peerNotes: data.peerNotes,
          finalNotes: data.finalNotes,
          selfScore: data.selfScore,
          managerScore: data.managerScore,
          peerScore: data.peerScore,
          finalScore: data.finalScore,
          peerEmployeeId: data.peerEmployeeId,
        },
        update: {
          status: data.status,
          selfNotes: data.selfNotes,
          managerNotes: data.managerNotes,
          peerNotes: data.peerNotes,
          finalNotes: data.finalNotes,
          selfScore: data.selfScore,
          managerScore: data.managerScore,
          peerScore: data.peerScore,
          finalScore: data.finalScore,
          peerEmployeeId: data.peerEmployeeId,
        },
      });
      return NextResponse.json(review, { status: 201 });
    }
    const data = goalSchema.parse(body);
    const metrics = metricFieldsFromText(data.target, data.actual ?? "");
    const goal = await prisma.performanceGoal.create({
      data: {
        companyId: session.user.companyId,
        employeeId: params.id,
        scope: "INDIVIDUAL",
        title: data.title,
        unit: data.unit || null,
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
