import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { can } from "@/lib/permissions";
import { CopilotWorkspace } from "@/components/copilot/copilot-workspace";

export const dynamic = "force-dynamic";

export default async function CopilotPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || !can(session.user.role, "askCopilot")) {
    redirect("/dashboard");
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Omni Co-Pilot</h1>
        <p className="mt-1 text-sm text-muted">
          Natural-language reporting over the engines you already use. It
          respects this seat&apos;s permissions and this company&apos;s boundary.
        </p>
      </div>
      <CopilotWorkspace />
    </AppShell>
  );
}
