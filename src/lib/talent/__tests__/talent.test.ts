import { describe, expect, it } from "vitest";
import { skillMatchPercent } from "@/lib/talent/skill-match";
import { applicationStatusLabel } from "@/lib/talent/labels";

describe("skillMatchPercent", () => {
  it("scores overlapping required skills in application text", () => {
    const result = skillMatchPercent(
      ["AutoCAD", "Welding", "Excel"],
      "Five years AutoCAD and shop-floor welding. No Excel listed."
    );
    expect(result.percent).toBe(67);
    expect(result.matched).toEqual(["AutoCAD", "Welding"]);
    expect(result.missing).toEqual(["Excel"]);
  });

  it("returns zero when the role has no required skills", () => {
    expect(skillMatchPercent([], "anything")).toEqual({
      percent: 0,
      matched: [],
      missing: [],
    });
  });
});

describe("applicationStatusLabel", () => {
  it("labels pipeline stages for HR", () => {
    expect(applicationStatusLabel("NEW")).toBe("Applied");
    expect(applicationStatusLabel("OFFER")).toBe("Offer");
  });
});
