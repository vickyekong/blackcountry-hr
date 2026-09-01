import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { isEmploymentEnded } from "@/lib/employees/status";
import { ensureAuthUrlEnv } from "@/lib/app-url";

export async function getSession() {
  ensureAuthUrlEnv();
  return getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    throw new AuthError("Unauthorized", 401);
  }
  const { ensureGroupSchema } = await import("@/lib/ensure-group-schema");
  await ensureGroupSchema();
  const { ensureAppRls } = await import("@/lib/ensure-app-rls");
  await ensureAppRls();
  return session;
}

export async function requirePermission(permission: Parameters<typeof can>[1]) {
  const session = await requireAuth();
  if (!can(session.user.role, permission)) {
    throw new AuthError("Forbidden", 403);
  }
  return session;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

function formatZodError(error: ZodError): string {
  const parts = error.issues.map((issue) => {
    const path = issue.path.length ? issue.path.join(".") : "input";
    if (path === "year" && issue.code === "too_small") {
      return "Year must be 2020 or later — check the report year (clock files sometimes mis-read old dates).";
    }
    return `${path}: ${issue.message}`;
  });
  return parts.join("; ") || "Invalid input";
}

export function handleApiError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: formatZodError(error) }, { status: 400 });
  }
  if (error instanceof Error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export function isEmployeeSelf(session: { user: { role: UserRole; employeeId?: string | null } }, employeeId: string) {
  return session.user.role === "EMPLOYEE" && session.user.employeeId === employeeId;
}

/** Staff portal: must be EMPLOYEE with a linked staff record. */
export async function requireStaffEmployee() {
  const session = await requireAuth();
  if (session.user.role !== "EMPLOYEE") {
    throw new AuthError("Forbidden", 403);
  }
  if (!session.user.employeeId) {
    throw new AuthError(
      "This login is not linked to a staff record. Ask HR to enable your portal.",
      403
    );
  }
  const employee = await prisma.employee.findFirst({
    where: {
      id: session.user.employeeId,
      companyId: session.user.companyId,
    },
    select: { status: true, employmentType: true },
  });
  if (
    !employee ||
    isEmploymentEnded(employee.status) ||
    employee.employmentType === "CONTRACT"
  ) {
    throw new AuthError(
      "Staff portal access has ended. Ask HR if you still need a login.",
      403
    );
  }
  return {
    ...session,
    employeeId: session.user.employeeId,
  };
}
