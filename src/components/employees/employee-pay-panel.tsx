"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { moneyRequestStatusLabel } from "@/lib/payroll/labels";
import { expenseStatusLabel } from "@/lib/expenses/policy";

type MoneyRow = {
  id: string;
  status: string;
  remainingKobo?: string;
  requestedKobo?: string;
  principalKobo?: string;
  amountKobo?: string;
};

export function EmployeePayPanel({ employeeId }: { employeeId: string }) {
  const [advances, setAdvances] = useState<MoneyRow[]>([]);
  const [loans, setLoans] = useState<MoneyRow[]>([]);
  const [deductions, setDeductions] = useState<MoneyRow[]>([]);
  const [expenses, setExpenses] = useState<MoneyRow[]>([]);

  useEffect(() => {
    fetch("/api/advances")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAdvances(data.filter((row) => row.employee?.id === employeeId));
        }
      });
    fetch("/api/loans")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setLoans(data.filter((row) => row.employee?.id === employeeId));
        }
      });
    fetch("/api/deductions")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setDeductions(
            data.filter(
              (row) => row.employee?.id === employeeId && row.status === "ACTIVE"
            )
          );
        }
      });
    fetch("/api/expenses")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setExpenses(data.filter((row) => row.employee?.id === employeeId));
        }
      });
  }, [employeeId]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Advances</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {advances.length === 0 ? (
            <p className="text-muted">No salary advances.</p>
          ) : (
            <ul className="space-y-2">
              {advances.map((row) => (
                <li key={row.id} className="flex justify-between gap-3">
                  <span>
                    {formatCurrency(row.requestedKobo ?? "0")} ·{" "}
                    {moneyRequestStatusLabel(row.status)}
                  </span>
                  <span className="tabular-nums text-muted">
                    left {formatCurrency(row.remainingKobo ?? "0")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Loans</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {loans.length === 0 ? (
            <p className="text-muted">No staff loans.</p>
          ) : (
            <ul className="space-y-2">
              {loans.map((row) => (
                <li key={row.id} className="flex justify-between gap-3">
                  <span>
                    {formatCurrency(row.principalKobo ?? "0")} ·{" "}
                    {moneyRequestStatusLabel(row.status)}
                  </span>
                  <span className="tabular-nums text-muted">
                    left {formatCurrency(row.remainingKobo ?? "0")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Expense claims</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {expenses.length === 0 ? (
            <p className="text-muted">No expense claims.</p>
          ) : (
            <ul className="space-y-2">
              {expenses.map((row) => (
                <li key={row.id} className="flex justify-between gap-3">
                  <span>{expenseStatusLabel(row.status)}</span>
                  <span className="tabular-nums">
                    {formatCurrency(row.amountKobo ?? "0")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Recurring deductions</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {deductions.length === 0 ? (
            <p className="text-muted">No active custom deductions.</p>
          ) : (
            <ul className="space-y-2">
              {deductions.map((row) => (
                <li key={row.id} className="flex justify-between">
                  <span>{row.status}</span>
                  <span className="tabular-nums">
                    {formatCurrency(row.amountKobo ?? "0")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
