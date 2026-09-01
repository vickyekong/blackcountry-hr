import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ensureGroupSchema } from "@/lib/ensure-group-schema";

export type WorkspaceCompany = {
  id: string;
  name: string;
  parentId: string | null;
  isHome: boolean;
  isGroup: boolean;
};

/** Group Super Admin / HR may open the home company and its direct subsidiaries. */
export function canSwitchAcrossGroup(role: UserRole): boolean {
  return role === "SUPER_ADMIN" || role === "HR_ADMIN";
}

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

export async function canAccessCompany(
  homeCompanyId: string,
  role: UserRole,
  targetCompanyId: string
): Promise<boolean> {
  const companies = await listAccessibleCompanies(homeCompanyId, role);
  return companies.some((c) => c.id === targetCompanyId);
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
