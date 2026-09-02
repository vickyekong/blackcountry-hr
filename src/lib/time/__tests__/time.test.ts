import { describe, expect, it } from "vitest";
import { nairaToKobo } from "@/lib/money";
import { localDateKey, parseLocalDay } from "@/lib/time/dates";
import {
  HOLIDAY_OVERTIME_BPS,
  WEEKDAY_OVERTIME_BPS,
  overtimeKobo,
  overtimeMultiplierBps,
} from "@/lib/time/overtime-math";

describe("local dates", () => {
  it("parses a calendar day without UTC drift", () => {
    const date = parseLocalDay("2026-10-01");
    expect(localDateKey(date)).toBe("2026-10-01");
  });
});

describe("overtime kobo", () => {
  it("pays 1.5× basic hourly on a weekday", () => {
    // 220_000 naira / 22 days = 10_000 naira/day = 1_250 naira/hour
    // 2 hours × 1.5 = 3_750 naira
    const amount = overtimeKobo({
      monthlyBasicKobo: nairaToKobo(220_000),
      workingDaysPerMonth: 22,
      minutes: 120,
      multiplierBps: WEEKDAY_OVERTIME_BPS,
    });
    expect(amount).toBe(nairaToKobo(3_750));
  });

  it("uses 2× on weekends and holidays", () => {
    expect(
      overtimeMultiplierBps({
        workDate: new Date(2026, 8, 5), // Saturday
        holiday: false,
      })
    ).toBe(HOLIDAY_OVERTIME_BPS);
    expect(
      overtimeMultiplierBps({
        workDate: new Date(2026, 8, 7), // Monday
        holiday: true,
      })
    ).toBe(HOLIDAY_OVERTIME_BPS);
    expect(
      overtimeMultiplierBps({
        workDate: new Date(2026, 8, 7),
        holiday: false,
      })
    ).toBe(WEEKDAY_OVERTIME_BPS);
  });
});
