import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { parseOptionalDate } from "@/lib/people/dates";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().trim().min(1).max(160),
  issuer: z.string().trim().max(160).nullable().optional(),
  issuedAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  fileUrl: z.string().trim().max(2_000).nullable().optional(),
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

    const rows = await prisma.employeeCertification.findMany({
      where: { employeeId: params.id },
      orderBy: [{ expiresAt: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(rows);
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

    const body = createSchema.parse(await req.json());
    const row = await prisma.employeeCertification.create({
      data: {
        employeeId: params.id,
        name: body.name,
        issuer: body.issuer?.trim() || null,
        issuedAt: parseOptionalDate(body.issuedAt ?? undefined) ?? null,
        expiresAt: parseOptionalDate(body.expiresAt ?? undefined) ?? null,
        fileUrl: body.fileUrl?.trim() || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        companyId: session.user.companyId,
        action: "CREATE",
        entityType: "EmployeeCertification",
        entityId: row.id,
        performedById: session.user.id,
        changes: { employeeId: params.id, name: row.name },
      },
    });

    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
