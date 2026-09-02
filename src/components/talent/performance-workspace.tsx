"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { employeeFullName } from "@/lib/utils";

type StaffRow = {
  id: string;
  name: string;
  department: string;
  employeeCode: string;
  goalCount: number;
  review: { status: string; managerScore: number | null } | null;
};

export function PerformanceWorkspace() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [staff, setStaff] = useState<StaffRow[]>([]);

  useEffect(() => {
    fetch(`/api/performance?year=${year}`)
      .then((r) => r.json())
      .then((data) => setStaff(Array.isArray(data.staff) ? data.staff : []));
  }, [year]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Performance</h1>
          <p className="mt-1 text-sm text-stone-500">
            Goals and annual reviews on each employee record. This does not
            change payroll — bonuses stay as payroll adjustments.
          </p>
        </div>
        <label className="text-sm text-stone-600">
          Year{" "}
          <input
            type="number"
            className="ml-2 h-9 w-24 rounded-md border border-stone-300 px-2"
            value={year}
            onChange={(e) => setYear(Number(e.target.value) || year)}
          />
        </label>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Staff this cycle</CardTitle>
        </CardHeader>
        <CardContent>
          {staff.length === 0 ? (
            <p className="text-sm text-stone-500">No staff in this company.</p>
          ) : (
            <ul className="divide-y divide-stone-100 rounded-md border border-stone-200">
              {staff.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
                >
                  <div>
                    <Link
                      href={`/employees/${row.id}`}
                      className="font-medium text-stone-900 hover:underline"
                    >
                      {row.name}
                    </Link>
                    <p className="text-xs text-stone-500">
                      {row.employeeCode} · {row.department}
                    </p>
                  </div>
                  <p className="text-xs text-stone-500">
                    {row.goalCount} goal{row.goalCount === 1 ? "" : "s"}
                    {row.review
                      ? ` · review ${row.review.status.toLowerCase()}${
                          row.review.managerScore
                            ? ` · ${row.review.managerScore}/5`
                            : ""
                          }`
                      : " · no review"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
