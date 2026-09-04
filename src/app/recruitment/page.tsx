import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { RecruitmentBoard } from "@/components/recruitment/recruitment-board";
import { UserPlus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RecruitmentPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !can(session.user.role, "manageRecruitment")) {
    redirect("/dashboard");
  }

  return (
    <AppShell>
      <PageHeader
        icon={UserPlus}
        title="Recruitment"
        description="Create job listings, post them to boards, and track applications. When you hire, create the staff profile — full-time people can get a Staff portal login."
      />
      <RecruitmentBoard />
    </AppShell>
  );
}
