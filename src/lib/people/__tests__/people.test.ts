import { describe, expect, it } from "vitest";
import { parseOptionalDate } from "@/lib/people/dates";
import { expiryAlert } from "@/lib/people/expiry";
import {
  buildReportingForest,
  wouldCreateReportingCycle,
} from "@/lib/people/reporting-tree";

describe("parseOptionalDate", () => {
  it("stores a calendar day at noon UTC", () => {
    const date = parseOptionalDate("2026-09-01");
    expect(date?.toISOString()).toBe("2026-09-01T12:00:00.000Z");
  });

  it("clears empty values", () => {
    expect(parseOptionalDate("")).toBeNull();
    expect(parseOptionalDate(null)).toBeNull();
    expect(parseOptionalDate(undefined)).toBeUndefined();
  });
});

describe("expiryAlert", () => {
  const now = new Date("2026-09-01T12:00:00.000Z");

  it("flags expired and soon-to-expire dates", () => {
    expect(expiryAlert(new Date("2026-08-01T12:00:00.000Z"), now)).toBe(
      "expired"
    );
    expect(expiryAlert(new Date("2026-10-01T12:00:00.000Z"), now)).toBe("soon");
    expect(expiryAlert(new Date("2027-01-01T12:00:00.000Z"), now)).toBeNull();
    expect(expiryAlert(null, now)).toBeNull();
  });
});

describe("reporting tree", () => {
  it("blocks a manager cycle", () => {
    const reportsTo = new Map([
      ["a", "b"],
      ["b", "c"],
      ["c", null],
    ]);
    expect(wouldCreateReportingCycle("c", "a", reportsTo)).toBe(true);
    expect(wouldCreateReportingCycle("a", "c", reportsTo)).toBe(false);
    expect(wouldCreateReportingCycle("a", "a", reportsTo)).toBe(true);
    expect(wouldCreateReportingCycle("a", null, reportsTo)).toBe(false);
  });

  it("nests direct reports under their manager", () => {
    const forest = buildReportingForest([
      { id: "ceo", managerId: null },
      { id: "head", managerId: "ceo" },
      { id: "staff", managerId: "head" },
      { id: "orphan", managerId: "missing" },
    ]);
    expect(forest.map((n) => n.person.id)).toEqual(["ceo", "orphan"]);
    expect(forest[0].reports[0].person.id).toBe("head");
    expect(forest[0].reports[0].reports[0].person.id).toBe("staff");
  });
});
