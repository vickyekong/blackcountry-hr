"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { assetTypeLabel } from "@/lib/people/labels";
import { formatDate } from "@/lib/utils";

type AssetRow = {
  id: string;
  assetCode: string;
  name: string;
  assetType: string;
  assignedAt: string | null;
  condition: string | null;
};

export function EmployeeAssetsPanel({ employeeId }: { employeeId: string }) {
  const [rows, setRows] = useState<AssetRow[]>([]);

  const load = useCallback(() => {
    fetch(`/api/employees/${employeeId}/assets`)
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
        <CardTitle>Assets &amp; equipment</CardTitle>
        <p className="text-sm text-stone-500">
          Company items currently assigned to this staff member. Assign or
          return them from the Assets register.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <p className="text-sm text-stone-500">No assets assigned.</p>
        ) : (
          <ul className="divide-y divide-stone-100 rounded-md border border-stone-200">
            {rows.map((row) => (
              <li key={row.id} className="px-3 py-2.5 text-sm">
                <p className="font-medium text-stone-900">
                  {row.assetCode} · {row.name}
                </p>
                <p className="text-xs text-stone-500">
                  {assetTypeLabel(row.assetType)}
                  {row.assignedAt ? ` · since ${formatDate(row.assignedAt)}` : ""}
                  {row.condition ? ` · ${row.condition}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
        <Button asChild variant="outline" size="sm">
          <Link href="/assets">Open assets register</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
