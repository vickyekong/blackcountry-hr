import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { AppShell } from "@/components/layout/app-shell";
import { ListingWorkspace } from "@/components/recruitment/listing-workspace";

export const dynamic = "force-dynamic";

export default async function RecruitmentListingPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !can(session.user.role, "manageRecruitment")) {
    redirect("/dashboard");
  }

  return (
    <AppShell>
      <p className="mb-4 text-sm">
        <Link href="/recruitment" className="text-ok underline">
          ← All listings
        </Link>
      </p>
      <ListingWorkspace listingId={params.id} />
    </AppShell>
  );
}
