import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { serializeBigInts } from "@/lib/payroll/config-mapper";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export async function GET() {
  try {
    const session = await requirePermission("viewEmployees");
    const departments = await prisma.department.findMany({
      where: { companyId: session.user.companyId },
      orderBy: { name: "asc" },
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
          },
        },
      },
    });
    return NextResponse.json(serializeBigInts(departments));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("manageEmployees");
    const body = createSchema.parse(await req.json());
    const name = body.name;

    const existing = await prisma.department.findUnique({
      where: {
        companyId_name: {
          companyId: session.user.companyId,
          name,
        },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Department already exists" },
        { status: 409 }
      );
    }

    const department = await prisma.department.create({
      data: {
        companyId: session.user.companyId,
        name,
      },
    });

    await prisma.auditLog.create({
      data: {
        companyId: session.user.companyId,
        action: "CREATE",
        entityType: "Department",
        entityId: department.id,
        performedById: session.user.id,
        changes: { name },
      },
    });

    return NextResponse.json(department, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
