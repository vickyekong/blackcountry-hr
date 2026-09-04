"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ReportStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xl font-semibold tabular-nums text-ink">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
