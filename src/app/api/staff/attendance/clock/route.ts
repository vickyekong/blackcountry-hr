import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, requireStaffEmployee } from "@/lib/api-auth";
import { startOfDay, endOfDay } from "date-fns";

export async function GET() {
  try {
    const session = await requireStaffEmployee();
    const today = new Date();
    const punches = await prisma.attendancePunch.findMany({
      where: {
        companyId: session.user.companyId,
        employeeId: session.employeeId,
        punchedAt: { gte: startOfDay(today), lte: endOfDay(today) },
      },
      orderBy: { punchedAt: "asc" },
    });
    const last = punches[punches.length - 1] ?? null;
    const nextType = last?.punchType === "IN" ? "OUT" : "IN";
    return NextResponse.json({
      punches,
      nextType,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST() {
  try {
    const session = await requireStaffEmployee();
    const employee = await prisma.employee.findFirst({
      where: { id: session.employeeId, companyId: session.user.companyId },
      select: { id: true, clockDeviceId: true, employeeCode: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const today = new Date();
    const punches = await prisma.attendancePunch.findMany({
      where: {
        companyId: session.user.companyId,
        employeeId: employee.id,
        punchedAt: { gte: startOfDay(today), lte: endOfDay(today) },
      },
      orderBy: { punchedAt: "asc" },
    });
    const last = punches[punches.length - 1];
    const punchType = last?.punchType === "IN" ? "OUT" : "IN";
    const punchedAt = new Date();
    const deviceUserId = employee.clockDeviceId || employee.employeeCode;

    const punch = await prisma.attendancePunch.create({
      data: {
        companyId: session.user.companyId,
        deviceUserId,
        employeeId: employee.id,
        punchedAt,
        punchType,
        source: "STAFF_PORTAL",
      },
    });
    return NextResponse.json({ punch, punchType }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
