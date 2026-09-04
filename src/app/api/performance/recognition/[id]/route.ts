import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission, handleApiError } from "@/lib/api-auth";
import { ensurePerformanceSchema } from "@/lib/ensure-performance-schema";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePermission("viewEmployees");
    await ensurePerformanceSchema();
    const existing = await prisma.recognition.findFirst({
      where: { id: params.id, companyId: session.user.companyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.recognition.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
