import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ReportsWorkspace } from "@/components/reports/reports-workspace";
import { can } from "@/lib/permissions";

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || !can(session.user.role, "viewReports")) {
    redirect("/dashboard");
  }

  return (
    <AppShell>
      <Suspense>
        <ReportsWorkspace />
      </Suspense>
    </AppShell>
  );
}
