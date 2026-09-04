"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { employeeFullName, formatCurrency, formatDate } from "@/lib/utils";
import { can } from "@/lib/permissions";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  REIMBURSEMENT_METHODS,
  REIMBURSEMENT_METHOD_LABELS,
  expenseCategoryLabel,
  expenseStatusLabel,
  reimbursementMethodLabel,
} from "@/lib/expenses/policy";

const MAX_BYTES = 900_000;

async function fileToDataUrl(file: File): Promise<string> {
  if (file.size > MAX_BYTES) {
    throw new Error("File is too large — keep PDFs and images under ~900KB");
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read file"));
        return;
      }
      if (result.length > 1_200_000) {
        reject(new Error("Encoded file is too large — try a smaller PDF or image"));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

type StaffOption = {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
};

type Row = {
  id: string;
  category: string;
  amountKobo: string;
  approvedAmountKobo: string;
  description: string;
  incurredOn: string;
  status: string;
  hasReceipt?: boolean;
  approvalHint?: string;
  reimbursementMethod?: string | null;
  reimbursementRef?: string | null;
  reviewNote?: string | null;
  employee?: StaffOption;
};

function statusVariant(status: string) {
  if (status === "APPROVED") return "info" as const;
  if (status === "REIMBURSED") return "success" as const;
  if (status === "REJECTED") return "danger" as const;
  return "warning" as const;
}

export function ExpensesPanel({
  variant,
}: {
  variant: "review" | "reimburse" | "staff" | "watch";
}) {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const [rows, setRows] = useState<Row[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const canCreate = variant === "review" && role && can(role, "reviewExpenses");
  const canApprove = variant === "review";
  const canPay = variant === "reimburse" && role && can(role, "reimburseExpenses");
  const endpoint = variant === "staff" ? "/api/staff/expenses" : "/api/expenses";

  function load() {
    fetch(endpoint)
      .then((r) => r.json())
      .then((data) => setRows(Array.isArray(data) ? data : []));
    if (canCreate) {
      fetch("/api/employees")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setStaff(data);
        })
        .catch(() => undefined);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, variant, canCreate]);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setMessage("");
    try {
      const data = new FormData(form);
      const file = data.get("receipt") as File | null;
      const receiptUrl =
        file && file.size > 0 ? await fileToDataUrl(file) : undefined;
      const payload: Record<string, unknown> = {
        category: data.get("category"),
        amountNaira: Number(data.get("amountNaira") || 0),
        description: data.get("description"),
        incurredOn: data.get("incurredOn"),
        receiptUrl,
      };
      if (variant === "review") {
        payload.employeeId = data.get("employeeId");
      }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.error ?? "Could not submit claim");
        return;
      }
      form.reset();
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not submit claim");
    } finally {
      setBusy(false);
    }
  }

  async function act(
    id: string,
    action: "approve" | "reject" | "reimburse",
    extra?: Record<string, unknown>
  ) {
    setBusy(true);
    setMessage("");
    const res = await fetch(`/api/expenses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(json.error ?? "Update failed");
      return;
    }
    load();
  }

  async function openReceipt(id: string) {
    const res = await fetch(`/api/expenses/${id}`);
    const json = await res.json();
    if (!res.ok || !json.receiptUrl) {
      setMessage(json.error ?? "No receipt on this claim");
      return;
    }
    window.open(json.receiptUrl, "_blank", "noopener,noreferrer");
  }

  const visible =
    variant === "reimburse"
      ? rows.filter(
          (row) =>
            row.status === "APPROVED" ||
            row.status === "REIMBURSED" ||
            row.reimbursementMethod === "PAYROLL"
        )
      : variant === "watch"
        ? rows.filter((row) => row.status === "PENDING")
        : rows;

  const title =
    variant === "staff"
      ? "Expense claims"
      : variant === "reimburse"
        ? "Ready to pay"
        : variant === "watch"
          ? "Waiting on approval"
          : "Claims";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted">
          {variant === "staff"
            ? "Upload a receipt. Amounts up to ₦100,000 can be cleared by your line manager or HR; above ₦500,000 needs Super Admin. Finance pays approved claims."
            : variant === "reimburse"
              ? "Pay approved claims by bank transfer or cash, or queue them on the next payroll as a non-taxable reimbursement. Super Admin still signs off that payroll run."
              : variant === "watch"
                ? "These claims still need HR, Super Admin, or the line manager. You cannot approve them here — you pay after they are cleared."
                : "Expense reports land with HR and Super Admin. Approve or send back — Finance pays on the Finance portal."}
        </p>
        {(variant === "staff" || canCreate) && (
          <form
            onSubmit={add}
            className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {canCreate ? (
              <div>
                <Label htmlFor="employeeId">Employee</Label>
                <select
                  id="employeeId"
                  name="employeeId"
                  required
                  className="mt-1 flex h-9 w-full rounded-md border border-line px-3 text-sm"
                >
                  <option value="">Select staff</option>
                  {staff.map((person) => (
                    <option key={person.id} value={person.id}>
                      {employeeFullName(person.firstName, person.lastName)} (
                      {person.employeeCode})
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div>
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                name="category"
                required
                className="mt-1 flex h-9 w-full rounded-md border border-line px-3 text-sm"
                defaultValue="OTHER"
              >
                {EXPENSE_CATEGORIES.map((kind) => (
                  <option key={kind} value={kind}>
                    {EXPENSE_CATEGORY_LABELS[kind]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="amountNaira">Amount (₦)</Label>
              <Input
                id="amountNaira"
                name="amountNaira"
                type="number"
                min={1}
                required
              />
            </div>
            <div>
              <Label htmlFor="incurredOn">Date incurred</Label>
              <Input id="incurredOn" name="incurredOn" type="date" required />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                required
                placeholder="What was this for?"
              />
            </div>
            <div>
              <Label htmlFor="receipt">Receipt (image or PDF)</Label>
              <Input
                id="receipt"
                name="receipt"
                type="file"
                accept="image/*,application/pdf"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={busy}>
                {variant === "staff" ? "Submit claim" : "Record claim"}
              </Button>
            </div>
          </form>
        )}
        {message ? <p className="mb-3 text-sm text-red-700">{message}</p> : null}
        {visible.length === 0 ? (
          <p className="text-sm text-muted">No expense claims yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {visible.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <p className="font-medium text-ink">
                    {row.employee
                      ? employeeFullName(
                          row.employee.firstName,
                          row.employee.lastName
                        )
                      : expenseCategoryLabel(row.category)}
                    {row.employee
                      ? ` · ${expenseCategoryLabel(row.category)}`
                      : ""}
                  </p>
                  <p className="text-sm text-muted">
                    {formatCurrency(row.amountKobo)}
                    {row.status !== "PENDING" && row.approvedAmountKobo
                      ? ` · approved ${formatCurrency(row.approvedAmountKobo)}`
                      : ""}
                    {` · ${formatDate(row.incurredOn)}`}
                    {row.reimbursementMethod
                      ? ` · ${reimbursementMethodLabel(row.reimbursementMethod)}`
                      : ""}
                  </p>
                  <p className="text-sm text-ink-soft">{row.description}</p>
                  {row.approvalHint && row.status === "PENDING" ? (
                    <p className="mt-1 text-xs text-muted">{row.approvalHint}</p>
                  ) : null}
                  {row.reviewNote ? (
                    <p className="mt-1 text-xs text-muted">Note: {row.reviewNote}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(row.status)}>
                    {expenseStatusLabel(row.status)}
                  </Badge>
                  {row.hasReceipt ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() => openReceipt(row.id)}
                    >
                      Receipt
                    </Button>
                  ) : null}
                  {canApprove && row.status === "PENDING" ? (
                    <>
                      <Button
                        type="button"
                        disabled={busy}
                        onClick={() => act(row.id, "approve")}
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={() => act(row.id, "reject")}
                      >
                        Send back
                      </Button>
                    </>
                  ) : null}
                  {canPay && row.status === "APPROVED" && !row.reimbursementMethod ? (
                    <form
                      className="flex flex-wrap items-center gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const data = new FormData(e.currentTarget);
                        act(row.id, "reimburse", {
                          method: data.get("method"),
                          reference: data.get("reference") || undefined,
                        });
                      }}
                    >
                      <select
                        name="method"
                        required
                        className="flex h-9 rounded-md border border-line px-2 text-sm"
                        defaultValue="BANK_TRANSFER"
                      >
                        {REIMBURSEMENT_METHODS.map((method) => (
                          <option key={method} value={method}>
                            {REIMBURSEMENT_METHOD_LABELS[method]}
                          </option>
                        ))}
                      </select>
                      <Input
                        name="reference"
                        placeholder="Reference"
                        className="w-32"
                      />
                      <Button type="submit" disabled={busy}>
                        Mark paid
                      </Button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
