import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { ensureTalentSchema } from "@/lib/ensure-talent-schema";
import { employeeFullName } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const session = await requirePermission("viewEmployees");
    await ensureTalentSchema();
    const year = Number(req.nextUrl.searchParams.get("year")) || new Date().getFullYear();
    const [reviews, goals, employees] = await Promise.all([
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
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.performanceGoal.findMany({
        where: { companyId: session.user.companyId, periodYear: year },
        select: { employeeId: true },
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
    ]);
    const goalCount = new Map<string, number>();
    for (const goal of goals) {
      goalCount.set(goal.employeeId, (goalCount.get(goal.employeeId) ?? 0) + 1);
    }
    return NextResponse.json({
      year,
      reviews: reviews.map((row) => ({
        ...row,
        employeeName: employeeFullName(row.employee.firstName, row.employee.lastName),
      })),
      staff: employees.map((emp) => ({
        ...emp,
        name: employeeFullName(emp.firstName, emp.lastName),
        goalCount: goalCount.get(emp.id) ?? 0,
        review: reviews.find((r) => r.employeeId === emp.id) ?? null,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
