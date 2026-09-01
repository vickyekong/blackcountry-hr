"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { can } from "@/lib/permissions";

export function RunPayrollCta({ label }: { label: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  if (!session?.user?.role || !can(session.user.role, "runPayroll")) {
    return null;
  }

  async function start() {
    setLoading(true);
    const now = new Date();
    const res = await fetch("/api/payroll/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        periodMonth: now.getMonth() + 1,
        periodYear: now.getFullYear(),
        applyAttendancePenalties: false,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      if (typeof data.error === "string" && data.error.toLowerCase().includes("already")) {
        router.push("/payroll");
        return;
      }
      alert(data.error ?? "Could not start payroll");
      return;
    }
    router.push(`/payroll/${data.id}`);
  }

  return (
    <Button
      onClick={() => void start()}
      disabled={loading}
      variant="brand"
      className="w-full sm:w-auto"
    >
      {loading ? "Starting…" : label}
    </Button>
  );
}
