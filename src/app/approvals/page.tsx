import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { can } from "@/lib/permissions";
import { ApprovalsInbox } from "@/components/automation/approvals-inbox";
import { Inbox } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || !can(session.user.role, "viewApprovals")) {
    redirect("/dashboard");
  }

  return (
    <AppShell>
      <PageHeader
        icon={Inbox}
        title="Approvals"
        description="One queue for work that already has an approval path. Clearing an item still happens on its own page."
      />
      <ApprovalsInbox />
    </AppShell>
  );
}
