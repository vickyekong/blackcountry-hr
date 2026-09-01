import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ensureGroupSchema } from "@/lib/ensure-group-schema";
import {
  accessibleCompaniesForSeat,
  ancestorCompanyIds,
  type AccessibleCompany,
} from "@/lib/tenancy/company-tree";

export { canSwitchAcrossGroup } from "@/lib/tenancy/group-access";

export type WorkspaceCompany = AccessibleCompany;

export type WorkspaceActor = {
  role: UserRole;
  companyId: string;
  homeCompanyId: string;
};

export async function listAccessibleCompanies(
  homeCompanyId: string,
  role: UserRole
): Promise<WorkspaceCompany[]> {
  await ensureGroupSchema();
  const all = await prisma.company.findMany({
    select: { id: true, name: true, parentId: true },
  });
  const home = all.find((c) => c.id === homeCompanyId);
  if (!home) return [];
  return accessibleCompaniesForSeat(home, all, role);
}

export async function accessibleCompanyIds(
  homeCompanyId: string,
  role: UserRole
): Promise<string[]> {
  const companies = await listAccessibleCompanies(homeCompanyId, role);
  return companies.map((c) => c.id);
}

/** Load a payroll run if it belongs to the active workspace or another company this seat can open. */
export async function findAccessiblePayrollRun(
  actor: WorkspaceActor,
  runId: string
) {
  const run = await prisma.payrollRun.findUnique({
    where: { id: runId },
  });
  if (!run) return null;
  if (run.companyId === actor.companyId) return run;
  if (await canAccessCompany(actor.homeCompanyId || actor.companyId, actor.role, run.companyId)) {
    return run;
  }
  return null;
}

export async function canAccessCompany(
  homeCompanyId: string,
  role: UserRole,
  targetCompanyId: string
): Promise<boolean> {
  const companies = await listAccessibleCompanies(homeCompanyId, role);
  return companies.some((c) => c.id === targetCompanyId);
}

export async function findAccessibleChangeRequest(
  actor: WorkspaceActor,
  requestId: string
) {
  const request = await prisma.employeeChangeRequest.findUnique({
    where: { id: requestId },
  });
  if (!request) return null;
  if (request.companyId === actor.companyId) return request;
  if (
    await canAccessCompany(
      actor.homeCompanyId || actor.companyId,
      actor.role,
      request.companyId
    )
  ) {
    return request;
  }
  return null;
}

export async function payrollApproverCompanyIds(
  operatingCompanyId: string
): Promise<string[]> {
  await ensureGroupSchema();
  const all = await prisma.company.findMany({
    select: { id: true, name: true, parentId: true },
  });
  return ancestorCompanyIds(operatingCompanyId, all);
}
