import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PRODUCT_NAME } from "@/lib/brand";
import { ensureRecruitmentSchema } from "@/lib/ensure-recruitment-schema";
import { PublicApplyForm } from "@/components/recruitment/public-apply-form";
import { getAppBaseUrl } from "@/lib/app-url";
import { applyUrlForListing } from "@/lib/recruitment/boards";

export const dynamic = "force-dynamic";

export default async function PublicJobPage({
  params,
}: {
  params: { id: string };
}) {
  await ensureRecruitmentSchema();
  const listing = await prisma.jobListing.findFirst({
    where: { id: params.id, status: "OPEN" },
    include: { company: { select: { name: true } } },
  });
  if (!listing) notFound();

  await prisma.jobListing.update({
    where: { id: listing.id },
    data: { viewCount: { increment: 1 } },
  });

  const applyUrl = applyUrlForListing(listing.id, getAppBaseUrl());
  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: listing.title,
    description: listing.description,
    datePosted: (listing.publishedAt ?? listing.createdAt).toISOString(),
    employmentType:
      listing.employmentType === "CONTRACT" ? "CONTRACTOR" : "FULL_TIME",
    hiringOrganization: {
      "@type": "Organization",
      name: listing.company.name,
    },
    jobLocation: {
      "@type": "Place",
      address: listing.location,
    },
    url: applyUrl,
  };

  return (
    <div className="min-h-screen bg-mist text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="border-b border-line bg-foam px-5 py-4">
        <p className="text-xs uppercase tracking-wide text-muted">{PRODUCT_NAME}</p>
        <p className="font-display text-lg font-semibold">{listing.company.name}</p>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10">
        <p className="text-sm text-muted">
          {listing.department} · {listing.location} ·{" "}
          {listing.employmentType === "CONTRACT" ? "Contract" : "Full-time"}
        </p>
        <h1 className="font-display mt-2 text-3xl font-semibold">{listing.title}</h1>
        <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed">
          {listing.description}
        </div>
        {listing.requirements && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold">Requirements</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
              {listing.requirements}
            </p>
          </div>
        )}
        <div className="mt-10 rounded-xl border border-line bg-foam p-5">
          <h2 className="text-base font-semibold">Apply</h2>
          <p className="mt-1 mb-4 text-sm text-muted">
            Your application goes to HR for this company.
          </p>
          <PublicApplyForm listingId={listing.id} />
        </div>
      </main>
    </div>
  );
}
