"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TRAINING_STATUS_LABELS } from "@/lib/talent/labels";

type Row = {
  id: string;
  status: string;
  assignedAt: string;
  completedAt: string | null;
  program: { id: string; name: string; required: boolean };
};

export function EmployeeTrainingPanel({ employeeId }: { employeeId: string }) {
  const [rows, setRows] = useState<Row[]>([]);

  const load = useCallback(() => {
    fetch(`/api/employees/${employeeId}/training`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRows(data);
      })
      .catch(() => undefined);
  }, [employeeId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Training</CardTitle>
        <p className="text-sm text-stone-500">
          Programmes assigned to this person. Enrol from the Training register.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-stone-500">No training assigned.</p>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-md border border-stone-200">
            {rows.map((row) => (
              <li key={row.id} className="px-3 py-2.5 text-sm">
                <p className="font-medium text-stone-900">
                  {row.program.name}
                  {row.program.required ? " · required" : ""}
                </p>
                <p className="text-xs text-stone-500">
                  {TRAINING_STATUS_LABELS[
                    row.status as keyof typeof TRAINING_STATUS_LABELS
                  ] ?? row.status}
                </p>
              </li>
            ))}
          </ul>
        )}
        <Button asChild variant="outline" size="sm">
          <Link href="/training">Open training</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
