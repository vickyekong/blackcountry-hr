import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { TrainingWorkspace } from "@/components/talent/training-workspace";
import { can } from "@/lib/permissions";

export default async function TrainingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || !can(session.user.role, "viewEmployees")) {
    redirect("/dashboard");
  }

  return (
    <AppShell>
      <TrainingWorkspace canManage={can(session.user.role, "manageEmployees")} />
    </AppShell>
  );
}
