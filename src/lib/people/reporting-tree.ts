export type ReportingPerson = {
  id: string;
  managerId: string | null;
};

export type ReportingNode<T extends ReportingPerson> = {
  person: T;
  reports: ReportingNode<T>[];
};

export function wouldCreateReportingCycle(
  employeeId: string,
  nextManagerId: string | null,
  reportsTo: Map<string, string | null>
): boolean {
  if (!nextManagerId) return false;
  if (nextManagerId === employeeId) return true;
  let current: string | null = nextManagerId;
  const seen = new Set<string>();
  while (current) {
    if (current === employeeId) return true;
    if (seen.has(current)) return true;
    seen.add(current);
    current = reportsTo.get(current) ?? null;
  }
  return false;
}

export function buildReportingForest<T extends ReportingPerson>(
  people: T[]
): ReportingNode<T>[] {
  const nodes = new Map<string, ReportingNode<T>>(
    people.map((person) => [person.id, { person, reports: [] }])
  );
  const roots: ReportingNode<T>[] = [];

  for (const node of nodes.values()) {
    const managerId = node.person.managerId;
    if (
      managerId &&
      managerId !== node.person.id &&
      nodes.has(managerId)
    ) {
      nodes.get(managerId)!.reports.push(node);
    } else {
      roots.push(node);
    }
  }

  function sortTree(list: ReportingNode<T>[]) {
    list.sort((a, b) => a.person.id.localeCompare(b.person.id));
    for (const child of list) sortTree(child.reports);
  }
  sortTree(roots);
  return roots;
}

export function forestHasReports<T extends ReportingPerson>(
  people: T[]
): boolean {
  return people.some(
    (person) => Boolean(person.managerId) && person.managerId !== person.id
  );
}
