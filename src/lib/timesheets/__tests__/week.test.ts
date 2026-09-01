import { describe, expect, it } from "vitest";
import {
  formatWeekRange,
  isoDateUtc,
  utcWeekDays,
  utcWeekEndExclusive,
  utcWeekStart,
} from "@/lib/timesheets/period";

describe("timesheet week", () => {
  it("starts Monday for a mid-week date", () => {
    const start = utcWeekStart("2026-09-02"); // Wednesday
    expect(isoDateUtc(start)).toBe("2026-08-31");
    expect(isoDateUtc(utcWeekEndExclusive(start))).toBe("2026-09-07");
    expect(utcWeekDays(start).map(isoDateUtc)).toEqual([
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
      "2026-09-06",
    ]);
  });

  it("treats Sunday as the end of the previous Monday week", () => {
    expect(isoDateUtc(utcWeekStart("2026-09-06"))).toBe("2026-08-31");
  });

  it("labels the week in UTC calendar dates", () => {
    expect(formatWeekRange("2026-08-31")).toContain("31");
    expect(formatWeekRange("2026-08-31")).toContain("6");
  });
});
