import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { serializeBigInts } from "@/lib/payroll/config-mapper";
import { nairaToKobo } from "@/lib/money";
import { z } from "zod";

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    managerEmployeeId: z.string().nullable().optional(),
    budgetNaira: z.number().min(0).nullable().optional(),
  })
  .refine(
    (body) =>
      body.name !== undefined ||
      body.managerEmployeeId !== undefined ||
      body.budgetNaira !== undefined,
    { message: "Provide a name, department head, or budget" }
  );

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("manageEmployees");
    const body = updateSchema.parse(await req.json());

    const existing = await prisma.department.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (body.name && body.name !== existing.name) {
      const clash = await prisma.department.findFirst({
        where: {
          companyId: session.user.companyId,
          name: body.name,
          NOT: { id: params.id },
        },
      });
      if (clash) {
        return NextResponse.json(
          { error: "Department already exists" },
          { status: 409 }
        );
      }
    }

    let managerEmployeeId: string | null | undefined;
    if (body.managerEmployeeId !== undefined) {
      if (!body.managerEmployeeId) {
        managerEmployeeId = null;
      } else {
        const head = await prisma.employee.findFirst({
          where: {
            id: body.managerEmployeeId,
            companyId: session.user.companyId,
          },
          select: { id: true },
        });
        if (!head) {
          return NextResponse.json(
            { error: "Department head not found in this company" },
            { status: 400 }
          );
        }
        managerEmployeeId = body.managerEmployeeId;
      }
    }

    let budgetKobo: bigint | null | undefined;
    if (body.budgetNaira !== undefined) {
      budgetKobo =
        body.budgetNaira === null ? null : nairaToKobo(body.budgetNaira);
    }

    const department = await prisma.department.update({
      where: { id: params.id },
      data: {
        ...(body.name && { name: body.name }),
        ...(managerEmployeeId !== undefined && { managerEmployeeId }),
        ...(budgetKobo !== undefined && { budgetKobo }),
      },
    });

    if (body.name && body.name !== existing.name) {
      await prisma.employee.updateMany({
        where: {
          companyId: session.user.companyId,
          department: existing.name,
        },
        data: { department: body.name },
      });
    }

    await prisma.auditLog.create({
      data: {
        companyId: session.user.companyId,
        action: "UPDATE",
        entityType: "Department",
        entityId: department.id,
        performedById: session.user.id,
        changes: {
          from: existing.name,
          to: department.name,
          managerEmployeeId: department.managerEmployeeId,
          budgetKobo:
            department.budgetKobo === null
              ? null
              : department.budgetKobo.toString(),
        },
      },
    });

    return NextResponse.json(serializeBigInts(department));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("manageEmployees");
    const existing = await prisma.department.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const inUse = await prisma.employee.count({
      where: {
        companyId: session.user.companyId,
        department: existing.name,
      },
    });
    if (inUse > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete “${existing.name}” while ${inUse} employee(s) are assigned to it`,
        },
        { status: 400 }
      );
    }

    await prisma.department.delete({ where: { id: params.id } });

    await prisma.auditLog.create({
      data: {
        companyId: session.user.companyId,
        action: "DELETE",
        entityType: "Department",
        entityId: params.id,
        performedById: session.user.id,
        changes: { name: existing.name },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
