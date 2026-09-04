"use client";

import { useMemo } from "react";
import type { EmployeeTableRow } from "@/components/employees/employees-table";
import {
  buildReportingForest,
  forestHasReports,
} from "@/lib/people/reporting-tree";

type OrgPerson = Pick<
  EmployeeTableRow,
  | "id"
  | "employeeCode"
  | "firstName"
  | "lastName"
  | "jobTitle"
  | "department"
  | "status"
> & { managerId: string | null };

function PersonLine({ person }: { person: OrgPerson }) {
  return (
    <li className="text-sm">
      <a
        href={`/employees/${person.id}`}
        className="font-medium text-ink hover:underline"
      >
        {person.firstName} {person.lastName}
      </a>
      <p className="text-xs text-muted">
        {person.jobTitle || "—"}
        <span className="text-muted"> · {person.employeeCode}</span>
      </p>
    </li>
  );
}

function ReportBranch({ node }: { node: ReportingNode<OrgPerson> }) {
  return (
    <li>
      <PersonLine person={node.person} />
      {node.reports.length > 0 && (
        <ul className="ml-4 mt-2 space-y-2 border-l border-line pl-3">
          {node.reports.map((child) => (
            <ReportBranch key={child.person.id} node={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function OrgChartPanel({ employees }: { employees: EmployeeTableRow[] }) {
  const people: OrgPerson[] = useMemo(
    () =>
      employees.map((person) => ({
        ...person,
        managerId: person.managerId ?? null,
      })),
    [employees]
  );

  const active = useMemo(
    () =>
      people.filter(
        (e) =>
          e.status === "ACTIVE" ||
          e.status === "ON_LEAVE" ||
          e.status === "SICK_LEAVE"
      ),
    [people]
  );

  const reporting = useMemo(() => buildReportingForest(active), [active]);

  const showReports = forestHasReports(active);

  const departments = useMemo(() => {
    const byDept = new Map<string, OrgPerson[]>();
    for (const emp of active) {
      const key = emp.department?.trim() || "Unassigned";
      const list = byDept.get(key) ?? [];
      list.push(emp);
      byDept.set(key, list);
    }
    return Array.from(byDept.entries())
      .map(([name, people]) => ({
        name,
        people: [...people].sort((a, b) => {
          const title = a.jobTitle.localeCompare(b.jobTitle);
          if (title !== 0) return title;
          return `${a.firstName} ${a.lastName}`.localeCompare(
            `${b.firstName} ${b.lastName}`
          );
        }),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [active]);

  const total = departments.reduce((n, d) => n + d.people.length, 0);

  return (
    <div className="space-y-8">
      {showReports && (
        <div>
          <h2 className="text-lg font-semibold text-ink">
            Reporting lines
          </h2>
          <p className="mt-1 text-sm text-muted">
            Set a line manager on each employee record. Unassigned people appear
            at the top.
          </p>
          <ul className="mt-4 space-y-3 rounded-xl border border-line bg-white p-4">
            {reporting.map((node) => (
              <ReportBranch key={node.person.id} node={node} />
            ))}
          </ul>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-ink">
          Organisation chart
        </h2>
        <p className="mt-1 text-sm text-muted">
          Active staff grouped by department and job description ({total} people
          · {departments.length} departments)
        </p>
      </div>

      {departments.length === 0 ? (
        <p className="text-sm text-muted">No active staff to show.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {departments.map((dept) => (
            <section
              key={dept.name}
              className="rounded-xl border border-line bg-white p-4 shadow-sm"
            >
              <header className="mb-3 border-b border-line pb-2">
                <h3 className="text-sm font-semibold text-ink">
                  {dept.name}
                </h3>
                <p className="text-xs text-muted">
                  {dept.people.length}{" "}
                  {dept.people.length === 1 ? "person" : "people"}
                </p>
              </header>
              <ul className="space-y-2">
                {dept.people.map((person) => (
                  <PersonLine key={person.id} person={person} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
