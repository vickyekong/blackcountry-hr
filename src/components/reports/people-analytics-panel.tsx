"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getMonthName } from "@/lib/utils";
import { ReportStat } from "@/components/reports/report-stat";

type DeptRow = {
  department: string;
  headcount: number;
  hires: number;
  exits: number;
  turnoverPercent: number | null;
};

type Slice = { key: string; count: number; label: string };

type PeoplePayload = {
  currentHeadcount: number;
  hires: number;
  exits: number;
  voluntaryExits: number;
  involuntaryExits: number;
  averageHeadcount: number;
  turnoverPercent: number | null;
  byStatus: Slice[];
  bySex: Slice[];
  byDepartment: DeptRow[];
  monthly: Array<{
    month: number;
    headcount: number;
    hires: number;
    exits: number;
  }>;
};

export function PeopleAnalyticsPanel({ year }: { year: number }) {
  const [people, setPeople] = useState<PeoplePayload | null>(null);

  useEffect(() => {
    fetch(`/api/reports/analytics?year=${year}`)
      .then((r) => r.json())
      .then((data) => setPeople(data.people ?? null))
      .catch(() => setPeople(null));
  }, [year]);

  if (!people) {
    return <p className="text-sm text-stone-500">Loading people analytics…</p>;
  }

  const chart = people.monthly.map((row) => ({
    name: getMonthName(row.month).slice(0, 3),
    headcount: row.headcount,
    hires: row.hires,
    exits: row.exits,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-stone-500">
          Live headcount, demographics, hires, exits, and turnover for {year}.
          This is not a payroll run snapshot.
        </p>
        <Button variant="outline" size="sm" asChild>
          <a
            href={`/api/reports/analytics/export?year=${year}&kind=people`}
            download
          >
            Export CSV
          </a>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReportStat label="Current headcount" value={String(people.currentHeadcount)} />
        <ReportStat label={`Hires ${year}`} value={String(people.hires)} />
        <ReportStat
          label={`Exits ${year}`}
          value={`${people.exits} (${people.voluntaryExits} resigned · ${people.involuntaryExits} fired)`}
        />
        <ReportStat
          label="Turnover"
          value={
            people.turnoverPercent == null
              ? "—"
              : `${people.turnoverPercent}%`
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Headcount, hires, and exits</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="headcount" name="Headcount" fill="#44403c" radius={[4, 4, 0, 0]} />
              <Bar dataKey="hires" name="Hires" fill="#0f766e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="exits" name="Exits" fill="#b91c1c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {people.byStatus.map((row) => (
              <div key={row.key} className="flex justify-between">
                <span className="text-stone-500">{row.label}</span>
                <span className="tabular-nums font-medium">{row.count}</span>
              </div>
            ))}
            {people.byStatus.length === 0 && (
              <p className="text-stone-500">No staff on the books.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Demographics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {people.bySex.map((row) => (
              <div key={row.key} className="flex justify-between">
                <span className="text-stone-500">{row.label}</span>
                <span className="tabular-nums font-medium">{row.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Department distribution and turnover</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Headcount</TableHead>
                <TableHead className="text-right">Hires</TableHead>
                <TableHead className="text-right">Exits</TableHead>
                <TableHead className="text-right">Turnover</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.byDepartment.map((row) => (
                <TableRow key={row.department}>
                  <TableCell>{row.department}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.headcount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.hires}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.exits}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.turnoverPercent == null
                      ? "—"
                      : `${row.turnoverPercent}%`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
