import Link from "next/link";
import { prisma } from "@/lib/db";
import { PRODUCT_NAME } from "@/lib/brand";
import { ensureRecruitmentSchema } from "@/lib/ensure-recruitment-schema";

export const dynamic = "force-dynamic";

export default async function PublicJobsPage() {
  await ensureRecruitmentSchema();
  const listings = await prisma.jobListing.findMany({
    where: { status: "OPEN" },
    include: { company: { select: { name: true } } },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-mist text-ink">
      <header className="border-b border-line bg-foam px-5 py-4">
        <p className="page-kicker">{PRODUCT_NAME}</p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight">Open roles</h1>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10">
        {listings.length === 0 ? (
          <p className="text-sm text-muted">There are no open roles right now.</p>
        ) : (
          <ul className="space-y-3">
            {listings.map((listing) => (
              <li key={listing.id}>
                <Link
                  href={`/jobs/${listing.id}`}
                  className="block rounded-lg border border-line bg-foam px-5 py-4 shadow-panel hover:bg-sand"
                >
                  <p className="text-xs text-muted">{listing.company.name}</p>
                  <p className="mt-1 font-semibold">{listing.title}</p>
                  <p className="mt-1 text-sm text-muted">
                    {listing.department} · {listing.location} ·{" "}
                    {listing.employmentType === "CONTRACT" ? "Contract" : "Full-time"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
