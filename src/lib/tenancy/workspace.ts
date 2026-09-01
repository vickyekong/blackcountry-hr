import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ensureGroupSchema } from "@/lib/ensure-group-schema";
import { canSwitchAcrossGroup } from "@/lib/tenancy/group-access";

export { canSwitchAcrossGroup } from "@/lib/tenancy/group-access";

export type WorkspaceCompany = {
  id: string;
  name: string;
  parentId: string | null;
  isHome: boolean;
  isGroup: boolean;
};

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
  const home = await prisma.company.findUnique({
    where: { id: homeCompanyId },
    select: {
      id: true,
      name: true,
      parentId: true,
      subsidiaries: { select: { id: true, name: true, parentId: true } },
    },
  });
  if (!home) return [];

  const companies: WorkspaceCompany[] = [
    {
      id: home.id,
      name: home.name,
      parentId: home.parentId,
      isHome: true,
      isGroup: !home.parentId,
    },
  ];

  if (canSwitchAcrossGroup(role) && !home.parentId) {
    for (const child of home.subsidiaries) {
      companies.push({
        id: child.id,
        name: child.name,
        parentId: child.parentId,
        isHome: false,
        isGroup: false,
      });
    }
  }

  return companies;
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
  const company = await prisma.company.findUnique({
    where: { id: operatingCompanyId },
    select: { id: true, parentId: true },
  });
  if (!company) return [operatingCompanyId];
  return company.parentId
    ? [company.id, company.parentId]
    : [company.id];
}
