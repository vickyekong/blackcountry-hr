"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { reviewPeriodLabel } from "@/lib/performance/labels";

type StaffRow = {
  id: string;
  name: string;
  department: string;
  employeeCode: string;
  goalCount: number;
  achievementPercent: number | null;
  reviewCount: number;
  review: {
    status: string;
    periodLabel: string;
    selfScore: number | null;
    managerScore: number | null;
    peerScore: number | null;
    finalScore: number | null;
  } | null;
};

function pct(value: number | null | undefined) {
  return value == null ? "—" : `${value}%`;
}

function score(value: number | null | undefined) {
  return value == null ? "—" : `${value}/5`;
}

export function PerformanceReviewsPanel({ year }: { year: number }) {
  const [staff, setStaff] = useState<StaffRow[]>([]);

  useEffect(() => {
    fetch(`/api/performance?year=${year}`)
      .then((r) => r.json())
      .then((data) => setStaff(Array.isArray(data.staff) ? data.staff : []));
  }, [year]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appraisals this year</CardTitle>
        <p className="text-sm text-muted">
          Self, manager, peer, and final scores live on the employee record.
          Completing a review does not change pay.
        </p>
      </CardHeader>
      <CardContent>
        {staff.length === 0 ? (
          <p className="text-sm text-muted">No staff in this company.</p>
        ) : (
          <ul className="divide-y divide-line rounded-md border border-line">
            {staff.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
              >
                <div>
                  <Link
                    href={`/employees/${row.id}`}
                    className="font-medium text-ink hover:underline"
                  >
                    {row.name}
                  </Link>
                  <p className="text-xs text-muted">
                    {row.employeeCode} · {row.department}
                  </p>
                </div>
                <p className="text-xs text-muted">
                  {row.goalCount} KPI{row.goalCount === 1 ? "" : "s"} ·{" "}
                  {pct(row.achievementPercent)}
                  {row.review
                    ? ` · ${reviewPeriodLabel(row.review.periodLabel)} ${row.review.status.toLowerCase()} · self ${score(row.review.selfScore)} · manager ${score(row.review.managerScore)} · peer ${score(row.review.peerScore)} · final ${score(row.review.finalScore)}`
                    : " · no review"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
