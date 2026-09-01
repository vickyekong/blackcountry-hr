export const JOB_BOARDS = [
  "CAREERS_PAGE",
  "LINKEDIN",
  "INDEED",
  "JOBBERMAN",
  "HOT_NIGERIAN_JOBS",
  "OTHER",
] as const;

export type JobBoardId = (typeof JOB_BOARDS)[number];

export const JOB_BOARD_LABELS: Record<JobBoardId, string> = {
  CAREERS_PAGE: "Company careers page",
  LINKEDIN: "LinkedIn",
  INDEED: "Indeed",
  JOBBERMAN: "Jobberman",
  HOT_NIGERIAN_JOBS: "Hot Nigerian Jobs",
  OTHER: "Other board",
};

export function applyUrlForListing(listingId: string, origin: string) {
  return `${origin.replace(/\/$/, "")}/jobs/${listingId}`;
}

export function boardSharePayload(options: {
  board: JobBoardId;
  applyUrl: string;
  title: string;
  companyName: string;
  location: string;
  description: string;
}) {
  const encoded = encodeURIComponent(options.applyUrl);
  const text = encodeURIComponent(
    `${options.title} at ${options.companyName} (${options.location}). Apply: ${options.applyUrl}`
  );

  if (options.board === "LINKEDIN") {
    return {
      kind: "share" as const,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`,
      instructions:
        "Opens LinkedIn share. Paste the listing into a LinkedIn Job post, then mark it posted here.",
    };
  }
  if (options.board === "INDEED") {
    return {
      kind: "share" as const,
      url: `https://www.indeed.com/hire`,
      instructions:
        "Open Indeed Hire, create the job, and paste the apply URL as the application destination.",
    };
  }
  if (options.board === "JOBBERMAN") {
    return {
      kind: "share" as const,
      url: "https://www.jobberman.com/employers",
      instructions:
        "Sign in to Jobberman Employers, create the vacancy, and paste this apply URL.",
    };
  }
  if (options.board === "HOT_NIGERIAN_JOBS") {
    return {
      kind: "share" as const,
      url: "https://www.hotnigerianjobs.com/",
      instructions:
        "Post on Hot Nigerian Jobs and include this apply URL in the listing.",
    };
  }
  if (options.board === "CAREERS_PAGE") {
    return {
      kind: "share" as const,
      url: options.applyUrl,
      instructions: "This listing is already live on your careers apply page.",
    };
  }
  return {
    kind: "copy" as const,
    url: options.applyUrl,
    instructions: `Share this apply link. Suggested copy: ${decodeURIComponent(text)}`,
  };
}

export function listingPerformance(options: {
  viewCount: number;
  applicationCount: number;
}) {
  const views = Math.max(0, options.viewCount);
  const applications = Math.max(0, options.applicationCount);
  const conversionPercent =
    views === 0 ? 0 : Math.round((applications / views) * 1000) / 10;
  return { views, applications, conversionPercent };
}
