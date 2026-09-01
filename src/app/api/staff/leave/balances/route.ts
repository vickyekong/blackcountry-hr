import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, requireStaffEmployee } from "@/lib/api-auth";

export async function GET() {
  try {
    const session = await requireStaffEmployee();
    const year = new Date().getFullYear();

    const balances = await prisma.leaveBalance.findMany({
      where: { employeeId: session.employeeId, year },
      orderBy: { leaveType: "asc" },
    });

    const withAnnual =
      balances.length > 0
        ? balances
        : [
            {
              id: "implied-annual",
              leaveType: "ANNUAL" as const,
              year,
              entitledDays: 21,
              usedDays: 0,
            },
          ];

    return NextResponse.json(
      withAnnual.map((b) => ({
        id: b.id,
        leaveType: b.leaveType,
        year: b.year,
        entitledDays: b.entitledDays,
        usedDays: b.usedDays,
        remainingDays: b.entitledDays - b.usedDays,
      }))
    );
  } catch (error) {
    return handleApiError(error);
  }
}
