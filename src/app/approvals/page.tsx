import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { can } from "@/lib/permissions";
import { ApprovalsInbox } from "@/components/automation/approvals-inbox";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || !can(session.user.role, "viewApprovals")) {
    redirect("/dashboard");
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Approvals</h1>
        <p className="mt-1 text-sm text-muted">
          One queue for work that already has an approval path. Clearing an
          item still happens on its own page.
        </p>
      </div>
      <ApprovalsInbox />
    </AppShell>
  );
}
