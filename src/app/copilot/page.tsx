import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { can } from "@/lib/permissions";
import { CopilotWorkspace } from "@/components/copilot/copilot-workspace";
import { PageHeader } from "@/components/layout/page-header";
import { Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CopilotPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || !can(session.user.role, "askCopilot")) {
    redirect("/dashboard");
  }

  return (
    <AppShell>
      <PageHeader
        icon={Sparkles}
        title="Omni Co-Pilot"
        description="Natural-language reporting over the engines you already use. It respects this seat's permissions and this company's boundary."
      />
      <CopilotWorkspace />
    </AppShell>
  );
}
