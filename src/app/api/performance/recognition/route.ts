import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { ensurePerformanceSchema } from "@/lib/ensure-performance-schema";
import { employeeFullName } from "@/lib/utils";
import { RECOGNITION_KINDS } from "@/lib/performance/labels";

const createSchema = z.object({
  employeeId: z.string().min(1),
  kind: z.enum(RECOGNITION_KINDS),
  note: z.string().trim().max(1000).optional(),
});

export async function GET() {
  try {
    const session = await requirePermission("viewEmployees");
    await ensurePerformanceSchema();
    const rows = await prisma.recognition.findMany({
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
    });
    return NextResponse.json(
      rows.map((row) => ({
        ...row,
        employeeName: employeeFullName(
          row.employee.firstName,
          row.employee.lastName
        ),
        givenByName: row.givenBy.name,
      }))
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("viewEmployees");
    await ensurePerformanceSchema();
    const body = createSchema.parse(await req.json());
    const employee = await prisma.employee.findFirst({
      where: { id: body.employeeId, companyId: session.user.companyId },
      select: { id: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    const row = await prisma.recognition.create({
      data: {
        companyId: session.user.companyId,
        employeeId: employee.id,
        givenById: session.user.id,
        kind: body.kind,
        note: body.note ?? "",
      },
      include: {
        employee: {
          select: { firstName: true, lastName: true, employeeCode: true },
        },
        givenBy: { select: { name: true } },
      },
    });
    return NextResponse.json(
      {
        ...row,
        employeeName: employeeFullName(
          row.employee.firstName,
          row.employee.lastName
        ),
        givenByName: row.givenBy.name,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
