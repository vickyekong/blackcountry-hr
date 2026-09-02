import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PerformanceWorkspace } from "@/components/talent/performance-workspace";
import { can } from "@/lib/permissions";

export default async function PerformancePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || !can(session.user.role, "viewEmployees")) {
    redirect("/dashboard");
  }

  return (
    <AppShell>
      <PerformanceWorkspace />
    </AppShell>
  );
}
