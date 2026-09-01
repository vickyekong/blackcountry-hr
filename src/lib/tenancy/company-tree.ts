import type { UserRole } from "@prisma/client";
import { canSwitchAcrossGroup } from "@/lib/tenancy/group-access";

export type CompanyNode = {
  id: string;
  name: string;
  parentId: string | null;
};

export type AccessibleCompany = CompanyNode & {
  isHome: boolean;
  isGroup: boolean;
  depth: number;
};

function childrenOf(parentId: string, all: CompanyNode[]): CompanyNode[] {
  return all
    .filter((c) => c.parentId === parentId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Depth-first tree from a root, including the root. */
export function flattenCompanyTree(
  rootId: string,
  all: CompanyNode[],
  homeId: string
): AccessibleCompany[] {
  const out: AccessibleCompany[] = [];

  function walk(id: string, depth: number) {
    const node = all.find((c) => c.id === id);
    if (!node) return;
    out.push({
      id: node.id,
      name: node.name,
      parentId: node.parentId,
      isHome: node.id === homeId,
      isGroup: !node.parentId,
      depth,
    });
    for (const child of childrenOf(id, all)) {
      walk(child.id, depth + 1);
    }
  }

  walk(rootId, 0);
  return out;
}

/**
 * Group Super Admin / HR / Finance at the holding company see the full tree
 * (Farms, Engineering, and Engineering's sub-companies).
 * Business head (and group seats whose home is not the holding company) see
 * their home company plus descendants only.
 */
export function accessibleCompaniesForSeat(
  home: CompanyNode,
  all: CompanyNode[],
  role: UserRole
): AccessibleCompany[] {
  if (role === "EMPLOYEE") {
    return [
      {
        ...home,
        isHome: true,
        isGroup: !home.parentId,
        depth: 0,
      },
    ];
  }

  if (canSwitchAcrossGroup(role) && !home.parentId) {
    return flattenCompanyTree(home.id, all, home.id);
  }

  if (canSwitchAcrossGroup(role) || role === "BUSINESS_HEAD") {
    return flattenCompanyTree(home.id, all, home.id);
  }

  return [
    {
      ...home,
      isHome: true,
      isGroup: !home.parentId,
      depth: 0,
    },
  ];
}

/** Operating company plus every parent up to the group. */
export function ancestorCompanyIds(
  companyId: string,
  all: CompanyNode[]
): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  let current = all.find((c) => c.id === companyId);
  while (current && !seen.has(current.id)) {
    ids.push(current.id);
    seen.add(current.id);
    current = current.parentId
      ? all.find((c) => c.id === current!.parentId)
      : undefined;
  }
  return ids.length ? ids : [companyId];
}
