import { NextRequest, NextResponse } from "next/server";
import { AuthError, handleApiError, requireAuth } from "@/lib/api-auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import {
  WEEKLY_CAPACITY_MINUTES,
  minutesToHours,
  remainingCapacityMinutes,
  workloadPercent,
} from "@/lib/projects/workload";
import {
  isoDateUtc,
  utcWeekEndExclusive,
  utcWeekStart,
} from "@/lib/timesheets/period";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (!can(session.user.role, "viewProjects")) {
      throw new AuthError("Forbidden", 403);
    }
    const weekParam = req.nextUrl.searchParams.get("weekStart");
    const weekStart = utcWeekStart(weekParam || new Date());
    const weekEnd = utcWeekEndExclusive(weekStart);
    const companyId = session.user.companyId;

    const [members, entries, staff] = await Promise.all([
      prisma.projectMember.findMany({
        where: {
          project: { companyId, status: { not: "ARCHIVED" } },
        },
        include: {
          project: { select: { id: true, name: true, status: true } },
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              status: true,
            },
          },
        },
      }),
      prisma.timesheetEntry.findMany({
        where: {
          companyId,
          workDate: { gte: weekStart, lt: weekEnd },
          status: { not: "REJECTED" },
        },
        select: { employeeId: true, minutes: true, projectId: true },
      }),
      prisma.employee.findMany({
        where: { companyId, status: "ACTIVE" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
        },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      }),
    ]);

    const loggedByEmployee = new Map<string, number>();
    for (const row of entries) {
      loggedByEmployee.set(
        row.employeeId,
        (loggedByEmployee.get(row.employeeId) ?? 0) + row.minutes
      );
    }

    const allocations = new Map<
      string,
      Array<{
        projectId: string;
        projectName: string;
        plannedMinutesPerWeek: number;
      }>
    >();
    const plannedByEmployee = new Map<string, number>();
    for (const member of members) {
      const list = allocations.get(member.employeeId) ?? [];
      list.push({
        projectId: member.project.id,
        projectName: member.project.name,
        plannedMinutesPerWeek: member.plannedMinutesPerWeek,
      });
      allocations.set(member.employeeId, list);
      plannedByEmployee.set(
        member.employeeId,
        (plannedByEmployee.get(member.employeeId) ?? 0) +
          member.plannedMinutesPerWeek
      );
    }

    const rows = staff
      .filter(
        (person) =>
          can(session.user.role, "manageProjects") ||
          person.id === session.user.employeeId
      )
      .map((person) => {
        const planned = plannedByEmployee.get(person.id) ?? 0;
        const logged = loggedByEmployee.get(person.id) ?? 0;
        return {
          employee: person,
          plannedMinutes: planned,
          loggedMinutes: logged,
          plannedHours: minutesToHours(planned),
          loggedHours: minutesToHours(logged),
          capacityMinutes: WEEKLY_CAPACITY_MINUTES,
          remainingMinutes: remainingCapacityMinutes(planned),
          loadPercent: workloadPercent(planned),
          allocations: allocations.get(person.id) ?? [],
        };
      });

    return NextResponse.json({
      weekStart: isoDateUtc(weekStart),
      capacityMinutes: WEEKLY_CAPACITY_MINUTES,
      rows,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
