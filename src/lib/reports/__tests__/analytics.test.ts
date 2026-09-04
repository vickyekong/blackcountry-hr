import { describe, expect, it } from "vitest";
import { nairaToKobo } from "@/lib/money";
import {
  attendanceRate,
  averageHeadcount,
  countBy,
  currentHeadcount,
  departmentPeople,
  employedOn,
  exitsInRange,
  hiresInRange,
  monthlyHeadcountSeries,
  overlapDays,
  turnoverRate,
  type AnalyticsPerson,
} from "@/lib/reports/people-analytics";
import {
  employerCostKobo,
  sumPayslipCosts,
} from "@/lib/reports/payroll-costs";

function person(
  partial: Partial<AnalyticsPerson> & Pick<AnalyticsPerson, "id">
): AnalyticsPerson {
  return {
    department: "Design",
    status: "ACTIVE",
    sex: "FEMALE",
    startDate: new Date(2024, 0, 15),
    endDate: null,
    ...partial,
  };
}

describe("headcount and movement", () => {
  it("counts current staff and excludes exits", () => {
    const asOf = new Date(2026, 8, 4);
    const people = [
      person({ id: "a", startDate: new Date(2025, 0, 1) }),
      person({
        id: "b",
        status: "RESIGNED",
        startDate: new Date(2025, 0, 1),
        endDate: new Date(2026, 5, 30),
      }),
      person({
        id: "c",
        status: "FIRED",
        startDate: new Date(2025, 0, 1),
        endDate: null,
      }),
    ];
    expect(currentHeadcount(people, asOf)).toBe(1);
    expect(employedOn(people[1], new Date(2026, 4, 1))).toBe(true);
    expect(employedOn(people[1], new Date(2026, 5, 30))).toBe(false);
  });

  it("places hires and exits in the month they happened", () => {
    const people = [
      person({ id: "h", startDate: new Date(2026, 2, 10) }),
      person({
        id: "v",
        status: "RESIGNED",
        startDate: new Date(2024, 0, 1),
        endDate: new Date(2026, 2, 20),
      }),
      person({
        id: "i",
        status: "FIRED",
        startDate: new Date(2024, 0, 1),
        endDate: new Date(2026, 2, 22),
      }),
    ];
    const from = new Date(2026, 2, 1);
    const to = new Date(2026, 2, 31);
    expect(hiresInRange(people, from, to)).toHaveLength(1);
    const exits = exitsInRange(people, from, to);
    expect(exits).toHaveLength(2);
    expect(exits.filter((p) => p.status === "RESIGNED")).toHaveLength(1);
    expect(exits.filter((p) => p.status === "FIRED")).toHaveLength(1);
  });

  it("computes turnover from exits over average headcount", () => {
    expect(turnoverRate(2, 10)).toBe(20);
    expect(turnoverRate(1, 3)).toBe(33.3);
    expect(turnoverRate(0, 0)).toBeNull();
  });

  it("builds a 12-month headcount series", () => {
    const people = [
      person({ id: "a", startDate: new Date(2025, 0, 1) }),
      person({
        id: "b",
        startDate: new Date(2026, 5, 1),
      }),
    ];
    const series = monthlyHeadcountSeries(people, 2026);
    expect(series).toHaveLength(12);
    expect(series[0].headcount).toBe(1);
    expect(series[5].hires).toBe(1);
    expect(series[11].headcount).toBe(2);
    expect(averageHeadcount(series)).toBeGreaterThan(1);
  });

  it("rolls department people with turnover", () => {
    const people = [
      person({ id: "a", department: "Design", startDate: new Date(2024, 0, 1) }),
      person({
        id: "b",
        department: "Design",
        status: "RESIGNED",
        startDate: new Date(2024, 0, 1),
        endDate: new Date(2026, 3, 1),
      }),
      person({
        id: "c",
        department: "Farms",
        startDate: new Date(2024, 0, 1),
      }),
    ];
    const rows = departmentPeople(people, 2026, new Date(2026, 8, 4));
    const design = rows.find((r) => r.department === "Design");
    expect(design?.headcount).toBe(1);
    expect(design?.exits).toBe(1);
    expect(design?.turnoverPercent).not.toBeNull();
  });

  it("groups demographics", () => {
    const people = [
      person({ id: "a", sex: "MALE" }),
      person({ id: "b", sex: "FEMALE" }),
      person({ id: "c", sex: null, department: "Farms" }),
    ];
    expect(countBy(people, (p) => p.sex ?? "Unspecified")).toEqual([
      { key: "FEMALE", count: 1 },
      { key: "MALE", count: 1 },
      { key: "Unspecified", count: 1 },
    ]);
  });
});

describe("time and payroll cost helpers", () => {
  it("counts overlapping leave days", () => {
    expect(
      overlapDays(
        new Date(2026, 0, 28),
        new Date(2026, 1, 3),
        new Date(2026, 1, 1),
        new Date(2026, 1, 28)
      )
    ).toBe(3);
  });

  it("scores attendance as present / (present + absent)", () => {
    expect(attendanceRate(18, 2)).toBe(90);
    expect(attendanceRate(0, 0)).toBeNull();
  });

  it("adds employer pension and NSITF onto gross for employer cost", () => {
    const slip = {
      grossPayKobo: nairaToKobo(500_000),
      netPayKobo: nairaToKobo(400_000),
      payeKobo: nairaToKobo(50_000),
      pensionEmployeeKobo: nairaToKobo(20_000),
      pensionEmployerKobo: nairaToKobo(25_000),
      nhfKobo: nairaToKobo(5_000),
      nsitfKobo: nairaToKobo(5_000),
    };
    expect(employerCostKobo(slip)).toBe(nairaToKobo(530_000));
    expect(sumPayslipCosts([slip, slip]).headcount).toBe(2);
  });
});
