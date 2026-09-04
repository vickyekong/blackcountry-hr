import { describe, expect, it } from "vitest";
import {
  achievementPercent,
  parseMetric,
  suggestedFinalScore,
  weightedAchievement,
} from "@/lib/performance/kpis";

describe("KPI achievement", () => {
  it("scores 620 against a 500 target as 124%", () => {
    expect(
      achievementPercent({ target: "500", actual: "620" })
    ).toBe(124);
  });

  it("prefers numeric columns over the text fields", () => {
    expect(
      achievementPercent({
        target: "narrative",
        actual: "also narrative",
        targetValue: 10,
        actualValue: 8,
      })
    ).toBe(80);
  });

  it("returns null when the target or actual is not a number", () => {
    expect(
      achievementPercent({ target: "Ship the plant", actual: "On track" })
    ).toBeNull();
  });

  it("treats a zero target and zero actual as 100%", () => {
    expect(achievementPercent({ target: "0", actual: "0" })).toBe(100);
  });

  it("parses comma-formatted numbers", () => {
    expect(parseMetric("1,250")).toBe(1250);
  });

  it("weights achievement across KPIs", () => {
    expect(
      weightedAchievement([
        { target: "100", actual: "80", weight: 50 },
        { target: "10", actual: "12", weight: 50 },
      ])
    ).toBe(100);
  });

  it("suggests a final score from self, manager, and peer", () => {
    expect(suggestedFinalScore([4, 5, 3])).toBe(4);
    expect(suggestedFinalScore([null, 5])).toBe(5);
    expect(suggestedFinalScore([null, undefined])).toBeNull();
  });
});
