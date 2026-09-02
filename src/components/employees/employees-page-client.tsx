"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  OrgCatalogManager,
  type CatalogItem,
} from "@/components/employees/org-catalog-manager";
import {
  EmployeesTable,
  type EmployeeTableRow,
} from "@/components/employees/employees-table";
import { OrgChartPanel } from "@/components/employees/org-chart-panel";
import { DepartmentsWorkspace, type DepartmentRow } from "@/components/employees/departments-workspace";
import { SkillsCatalogPanel, type SkillCatalogItem } from "@/components/employees/skills-catalog-panel";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type TabId = "staff" | "jobs" | "departments" | "skills" | "org";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "staff", label: "Staff directory" },
  { id: "jobs", label: "Job descriptions" },
  { id: "departments", label: "Departments" },
  { id: "skills", label: "Skills" },
  { id: "org", label: "Org chart" },
];

function tabFromSearch(value: string | null): TabId {
  if (value === "jobs" || value === "job-descriptions") return "jobs";
  if (value === "departments") return "departments";
  if (value === "skills") return "skills";
  if (value === "org" || value === "org-chart") return "org";
  return "staff";
}

function hrefForTab(tab: TabId): string {
  if (tab === "staff") return "/employees";
  if (tab === "jobs") return "/employees?tab=jobs";
  if (tab === "departments") return "/employees?tab=departments";
  if (tab === "skills") return "/employees?tab=skills";
  return "/employees?tab=org";
}

export function EmployeesPageClient({
  employees,
  initialDepartments,
  initialJobDescriptions,
  initialSkills,
  canManage,
}: {
  employees: EmployeeTableRow[];
  initialDepartments: DepartmentRow[];
  initialJobDescriptions: CatalogItem[];
  initialSkills: SkillCatalogItem[];
  canManage: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabId>(() =>
    tabFromSearch(searchParams.get("tab"))
  );
  const [departments, setDepartments] = useState(initialDepartments);
  const [jobDescriptions, setJobDescriptions] = useState(
    initialJobDescriptions
  );

  useEffect(() => {
    setTab(tabFromSearch(searchParams.get("tab")));
  }, [searchParams]);

  useEffect(() => {
    setDepartments(initialDepartments);
  }, [initialDepartments]);

  useEffect(() => {
    setJobDescriptions(initialJobDescriptions);
  }, [initialJobDescriptions]);

  function selectTab(next: TabId) {
    setTab(next);
    router.replace(hrefForTab(next), { scroll: false });
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-1 border-b border-stone-200">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => selectTab(item.id)}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              tab === item.id
                ? "border-stone-900 text-stone-900"
                : "border-transparent text-stone-500 hover:text-stone-800"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "staff" && (
        <EmployeesTable
          employees={employees}
          departments={departments.map((d) => d.name)}
          jobDescriptions={jobDescriptions.map((d) => d.name)}
        />
      )}

      {tab === "jobs" && (
        <Card>
          <CardContent className="pt-6">
            <OrgCatalogManager
              title="Job descriptions"
              description="Add job descriptions here, then assign them to employees from the Staff directory table. You can edit or remove existing ones."
              itemLabel="job description"
              items={jobDescriptions}
              apiBase="/api/job-descriptions"
              onChange={(next) => {
                setJobDescriptions(next);
                router.refresh();
              }}
            />
          </CardContent>
        </Card>
      )}

      {tab === "departments" && (
        <Card>
          <CardContent className="pt-6">
            <DepartmentsWorkspace
              initialDepartments={departments}
              canManage={canManage}
              onChange={(next) => {
                setDepartments(next);
                router.refresh();
              }}
            />
          </CardContent>
        </Card>
      )}

      {tab === "skills" && (
        <Card>
          <CardContent className="pt-6">
            <SkillsCatalogPanel items={initialSkills} canManage={canManage} />
          </CardContent>
        </Card>
      )}

      {tab === "org" && <OrgChartPanel employees={employees} />}
    </>
  );
}
