import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { AppShell } from "@/components/layout/app-shell";
import { RecruitmentBoard } from "@/components/recruitment/recruitment-board";

export const dynamic = "force-dynamic";

export default async function RecruitmentPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !can(session.user.role, "manageRecruitment")) {
    redirect("/dashboard");
  }

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink">Recruitment</h1>
        <p className="mt-1 text-sm text-muted">
          Create job listings, post them to boards, and track applications. When
          you hire, create the staff profile — full-time people can get a Staff
          portal login.
        </p>
      </div>
      <RecruitmentBoard />
    </AppShell>
  );
}
