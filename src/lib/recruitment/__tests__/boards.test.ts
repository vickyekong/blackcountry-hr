import { describe, expect, it } from "vitest";
import {
  applyUrlForListing,
  boardSharePayload,
  listingPerformance,
} from "@/lib/recruitment/boards";
import { generateTemporaryPassword } from "@/lib/auth/temp-password";

describe("recruitment boards", () => {
  it("builds an apply URL and LinkedIn share", () => {
    const applyUrl = applyUrlForListing("abc", "https://blackcountry-hr.vercel.app");
    expect(applyUrl).toBe("https://blackcountry-hr.vercel.app/jobs/abc");
    const share = boardSharePayload({
      board: "LINKEDIN",
      applyUrl,
      title: "Chef",
      companyName: "Blackcountry Group",
      location: "Lagos",
      description: "Run the kitchen",
    });
    expect(share.url).toContain("linkedin.com");
    expect(share.url).toContain(encodeURIComponent(applyUrl));
  });

  it("computes apply rate from views", () => {
    expect(listingPerformance({ viewCount: 40, applicationCount: 8 })).toEqual({
      views: 40,
      applications: 8,
      conversionPercent: 20,
    });
    expect(listingPerformance({ viewCount: 0, applicationCount: 2 }).conversionPercent).toBe(
      0
    );
  });
});

describe("temporary staff password", () => {
  it("generates a copyable password of the requested length", () => {
    const password = generateTemporaryPassword(12);
    expect(password).toHaveLength(12);
    expect(password).toMatch(/^[A-Za-z0-9]+$/);
  });
});
