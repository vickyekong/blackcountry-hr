import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { ensurePerformanceSchema } from "@/lib/ensure-performance-schema";
import { employeeFullName } from "@/lib/utils";
import {
  enrichGoal,
  metricFieldsFromText,
  weightedAchievement,
} from "@/lib/performance/kpis";
import {
  GOAL_SCOPES,
  RECOGNITION_KINDS,
  REVIEW_PERIODS,
} from "@/lib/performance/labels";

const goalSchema = z.object({
  scope: z.enum(GOAL_SCOPES).default("INDIVIDUAL"),
  department: z.string().trim().max(80).optional().nullable(),
  employeeId: z.string().optional().nullable(),
  title: z.string().trim().min(1).max(160),
  target: z.string().trim().min(1).max(160),
  actual: z.string().trim().max(160).optional(),
  unit: z.string().trim().max(40).optional().nullable(),
  weight: z.number().int().min(1).max(100).optional(),
  periodYear: z.number().int().min(2020).max(2100).optional(),
  periodLabel: z.enum(REVIEW_PERIODS).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requirePermission("viewEmployees");
    await ensurePerformanceSchema();
    const year =
      Number(req.nextUrl.searchParams.get("year")) || new Date().getFullYear();
    const [reviews, goals, employees, recognitions] = await Promise.all([
      prisma.performanceReview.findMany({
        where: { companyId: session.user.companyId, periodYear: year },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              department: true,
            },
          },
          peerEmployee: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.performanceGoal.findMany({
        where: { companyId: session.user.companyId, periodYear: year },
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: [{ scope: "asc" }, { createdAt: "desc" }],
      }),
      prisma.employee.findMany({
        where: {
          companyId: session.user.companyId,
          status: { notIn: ["FIRED", "RESIGNED"] },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
          department: true,
        },
        orderBy: { employeeCode: "asc" },
      }),
      prisma.recognition.findMany({
        where: { companyId: session.user.companyId },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
            },
          },
          givenBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 80,
      }),
    ]);

    const individualGoals = new Map<string, typeof goals>();
    const companyGoals = goals.filter((goal) => goal.scope === "COMPANY");
    const departmentGoals = goals.filter((goal) => goal.scope === "DEPARTMENT");
    for (const goal of goals) {
      if (!goal.employeeId) continue;
      const list = individualGoals.get(goal.employeeId) ?? [];
      list.push(goal);
      individualGoals.set(goal.employeeId, list);
    }

    const departments = Array.from(
      new Set(employees.map((emp) => emp.department).filter(Boolean))
    ).sort();

    return NextResponse.json({
      year,
      departments,
      kpi: {
        weightedAchievement: weightedAchievement(goals),
        goalCount: goals.length,
      },
      reviews: reviews.map((row) => ({
        ...row,
        employeeName: employeeFullName(
          row.employee.firstName,
          row.employee.lastName
        ),
        peerName: row.peerEmployee
          ? employeeFullName(
              row.peerEmployee.firstName,
              row.peerEmployee.lastName
            )
          : null,
      })),
      goals: goals.map((goal) => ({
        ...enrichGoal(goal),
        employeeName: goal.employee
          ? employeeFullName(goal.employee.firstName, goal.employee.lastName)
          : null,
      })),
      recognitions: recognitions.map((row) => ({
        ...row,
        employeeName: employeeFullName(
          row.employee.firstName,
          row.employee.lastName
        ),
        givenByName: row.givenBy.name,
      })),
      staff: employees.map((emp) => {
        const empReviews = reviews.filter((r) => r.employeeId === emp.id);
        const empGoals = [
          ...companyGoals,
          ...departmentGoals.filter((g) => g.department === emp.department),
          ...(individualGoals.get(emp.id) ?? []),
        ];
        return {
          ...emp,
          name: employeeFullName(emp.firstName, emp.lastName),
          goalCount: (individualGoals.get(emp.id) ?? []).length,
          achievementPercent: weightedAchievement(empGoals),
          review: empReviews[0] ?? null,
          reviewCount: empReviews.length,
        };
      }),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("manageEmployees");
    await ensurePerformanceSchema();
    const data = goalSchema.parse(await req.json());
    const periodYear = data.periodYear ?? new Date().getFullYear();
    const periodLabel = data.periodLabel ?? "ANNUAL";
    const metrics = metricFieldsFromText(data.target, data.actual ?? "");

    if (data.scope === "INDIVIDUAL") {
      if (!data.employeeId) {
        return NextResponse.json(
          { error: "Pick a staff member for an individual goal" },
          { status: 400 }
        );
      }
      const employee = await prisma.employee.findFirst({
        where: { id: data.employeeId, companyId: session.user.companyId },
        select: { id: true },
      });
      if (!employee) {
        return NextResponse.json(
          { error: "Employee not found" },
          { status: 404 }
        );
      }
    }
    if (data.scope === "DEPARTMENT" && !data.department?.trim()) {
      return NextResponse.json(
        { error: "Pick a department for a department goal" },
        { status: 400 }
      );
    }

    const goal = await prisma.performanceGoal.create({
      data: {
        companyId: session.user.companyId,
        scope: data.scope,
        employeeId:
          data.scope === "INDIVIDUAL" ? data.employeeId ?? null : null,
        department:
          data.scope === "DEPARTMENT" ? data.department?.trim() ?? null : null,
        title: data.title,
        unit: data.unit || null,
        weight: data.weight ?? 100,
        periodYear,
        periodLabel,
        ...metrics,
      },
    });
    return NextResponse.json(enrichGoal(goal), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
