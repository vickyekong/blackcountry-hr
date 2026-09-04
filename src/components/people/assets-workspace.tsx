"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ASSET_TYPES,
  assetStatusLabel,
  assetTypeLabel,
} from "@/lib/people/labels";
import { employeeFullName, formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Package } from "lucide-react";

type AssetRow = {
  id: string;
  assetCode: string;
  name: string;
  assetType: string;
  status: string;
  serialNumber: string | null;
  valueKobo: string;
  assignedEmployeeId: string | null;
  assignedEmployee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
  } | null;
};

type StaffOption = {
  id: string;
  firstName: string;
  lastName: string;
};

export function AssetsWorkspace({ canManage }: { canManage: boolean }) {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    fetch("/api/assets")
      .then((r) => r.json())
      .then((data) => setAssets(Array.isArray(data) ? data : []));
    fetch("/api/employees")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setStaff(
            data.map((emp: StaffOption) => ({
              id: emp.id,
              firstName: emp.firstName,
              lastName: emp.lastName,
            }))
          );
        }
      })
      .catch(() => undefined);
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const payload = {
      assetCode: String(form.assetCode.value || "").trim(),
      name: String(form.assetName.value || "").trim(),
      assetType: form.assetType.value,
      serialNumber: String(form.serialNumber.value || "") || null,
      valueNaira: Number(form.valueNaira.value || 0),
      purchasedAt: String(form.purchasedAt.value || "") || null,
    };
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? "Could not create asset");
      return;
    }
    form.reset();
    load();
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(true);
    await fetch(`/api/assets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Package}
        title="Assets & equipment"
        description="Track laptops, phones, vehicles, and other company items assigned to staff. Offboarding still uses the existing checklist — return items here so the register stays accurate."
      />

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Register an asset</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => void add(e)}
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              <div>
                <Label htmlFor="assetCode">Asset ID</Label>
                <Input id="assetCode" name="assetCode" className="mt-1" required />
              </div>
              <div>
                <Label htmlFor="assetName">Name</Label>
                <Input id="assetName" name="assetName" className="mt-1" required />
              </div>
              <div>
                <Label htmlFor="assetType">Type</Label>
                <select
                  id="assetType"
                  name="assetType"
                  className="mt-1 flex h-9 w-full rounded-md border border-line px-3 text-sm"
                  defaultValue="LAPTOP"
                >
                  {ASSET_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {assetTypeLabel(type)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="serialNumber">Serial number</Label>
                <Input id="serialNumber" name="serialNumber" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="valueNaira">Value (₦)</Label>
                <Input
                  id="valueNaira"
                  name="valueNaira"
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="purchasedAt">Purchase date</Label>
                <Input
                  id="purchasedAt"
                  name="purchasedAt"
                  type="date"
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <Button type="submit" disabled={busy}>
                  {busy ? "Saving…" : "Add asset"}
                </Button>
              </div>
            </form>
            {message && <p className="mt-3 text-sm text-red-600">{message}</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Register</CardTitle>
        </CardHeader>
        <CardContent>
          {assets.length === 0 ? (
            <p className="text-sm text-muted">No assets registered yet.</p>
          ) : (
            <ul className="divide-y divide-line rounded-md border border-line">
              {assets.map((asset) => (
                <li
                  key={asset.id}
                  className="flex flex-wrap items-start justify-between gap-3 px-3 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-ink">
                      {asset.assetCode} · {asset.name}
                    </p>
                    <p className="text-xs text-muted">
                      {assetTypeLabel(asset.assetType)} ·{" "}
                      {assetStatusLabel(asset.status)}
                      {asset.serialNumber ? ` · ${asset.serialNumber}` : ""}
                      {Number(asset.valueKobo) > 0
                        ? ` · ${formatCurrency(BigInt(asset.valueKobo))}`
                        : ""}
                    </p>
                    {asset.assignedEmployee && (
                      <p className="mt-1 text-xs text-muted">
                        Assigned to{" "}
                        <Link
                          href={`/employees/${asset.assignedEmployee.id}`}
                          className="underline"
                        >
                          {employeeFullName(
                            asset.assignedEmployee.firstName,
                            asset.assignedEmployee.lastName
                          )}
                        </Link>
                      </p>
                    )}
                  </div>
                  {canManage && (
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        className="h-8 rounded-md border border-line px-2 text-sm"
                        value={asset.assignedEmployeeId ?? ""}
                        disabled={busy || asset.status === "RETIRED"}
                        onChange={(e) =>
                          void patch(asset.id, {
                            assignedEmployeeId: e.target.value || null,
                          })
                        }
                      >
                        <option value="">Unassigned</option>
                        {staff.map((person) => (
                          <option key={person.id} value={person.id}>
                            {employeeFullName(person.firstName, person.lastName)}
                          </option>
                        ))}
                      </select>
                      {asset.status !== "RETIRED" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            void patch(asset.id, { status: "RETIRED" })
                          }
                        >
                          Retire
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
