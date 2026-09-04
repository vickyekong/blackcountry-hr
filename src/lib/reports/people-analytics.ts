import { isEmploymentEnded } from "@/lib/employees/status";

export type AnalyticsPerson = {
  id: string;
  department: string;
  status: string;
  sex: string | null;
  startDate: Date;
  endDate: Date | null;
};

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function endOfMonth(year: number, month: number) {
  return new Date(year, month, 0, 23, 59, 59, 999);
}

export function startOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1);
}

export function startOfYear(year: number) {
  return new Date(year, 0, 1);
}

export function endOfYear(year: number) {
  return new Date(year, 11, 31, 23, 59, 59, 999);
}

export function inRange(date: Date, from: Date, to: Date) {
  const t = startOfDay(date).getTime();
  return t >= startOfDay(from).getTime() && t <= startOfDay(to).getTime();
}

/** Still on the books at asOf — started, and not yet left. */
export function employedOn(person: AnalyticsPerson, asOf: Date): boolean {
  const day = startOfDay(asOf);
  if (startOfDay(person.startDate) > day) return false;
  if (person.endDate && startOfDay(person.endDate) <= day) return false;
  if (!person.endDate && isEmploymentEnded(person.status)) return false;
  return true;
}

export function currentHeadcount(people: AnalyticsPerson[], asOf = new Date()) {
  return people.filter((person) => employedOn(person, asOf)).length;
}

export function hiresInRange(
  people: AnalyticsPerson[],
  from: Date,
  to: Date
) {
  return people.filter((person) => inRange(person.startDate, from, to));
}

export function exitsInRange(
  people: AnalyticsPerson[],
  from: Date,
  to: Date
) {
  return people.filter((person) => {
    if (!person.endDate && !isEmploymentEnded(person.status)) return false;
    const left = person.endDate ?? null;
    if (!left) return false;
    return inRange(left, from, to);
  });
}

export function isVoluntaryExit(status: string) {
  return status === "RESIGNED";
}

export function isInvoluntaryExit(status: string) {
  return status === "FIRED";
}

/** Exits / average headcount, as a percent to 1 decimal. */
export function turnoverRate(
  exits: number,
  averageHeadcount: number
): number | null {
  if (averageHeadcount <= 0) return null;
  return Math.round((exits / averageHeadcount) * 1000) / 10;
}

export function countBy<T>(
  rows: T[],
  keyFn: (row: T) => string
): Array<{ key: string; count: number }> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = keyFn(row) || "Unknown";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

export type MonthHeadcountPoint = {
  month: number;
  year: number;
  headcount: number;
  hires: number;
  exits: number;
  voluntaryExits: number;
  involuntaryExits: number;
};

export function monthlyHeadcountSeries(
  people: AnalyticsPerson[],
  year: number
): MonthHeadcountPoint[] {
  const points: MonthHeadcountPoint[] = [];
  for (let month = 1; month <= 12; month += 1) {
    const from = startOfMonth(year, month);
    const to = endOfMonth(year, month);
    const hires = hiresInRange(people, from, to);
    const exits = exitsInRange(people, from, to);
    points.push({
      month,
      year,
      headcount: people.filter((person) => employedOn(person, to)).length,
      hires: hires.length,
      exits: exits.length,
      voluntaryExits: exits.filter((p) => isVoluntaryExit(p.status)).length,
      involuntaryExits: exits.filter((p) => isInvoluntaryExit(p.status)).length,
    });
  }
  return points;
}

export function averageHeadcount(points: Array<{ headcount: number }>) {
  if (!points.length) return 0;
  const sum = points.reduce((acc, point) => acc + point.headcount, 0);
  return sum / points.length;
}

export type DeptPeopleRow = {
  department: string;
  headcount: number;
  hires: number;
  exits: number;
  turnoverPercent: number | null;
};

export function departmentPeople(
  people: AnalyticsPerson[],
  year: number,
  asOf = new Date()
): DeptPeopleRow[] {
  const from = startOfYear(year);
  const to = endOfYear(year);
  const depts = new Set(people.map((p) => p.department || "Unknown"));
  const rows: DeptPeopleRow[] = [];
  for (const department of depts) {
    const inDept = people.filter(
      (p) => (p.department || "Unknown") === department
    );
    const series = monthlyHeadcountSeries(inDept, year);
    const exits = exitsInRange(inDept, from, to).length;
    rows.push({
      department,
      headcount: inDept.filter((p) => employedOn(p, asOf)).length,
      hires: hiresInRange(inDept, from, to).length,
      exits,
      turnoverPercent: turnoverRate(exits, averageHeadcount(series)),
    });
  }
  return rows.sort(
    (a, b) => b.headcount - a.headcount || a.department.localeCompare(b.department)
  );
}

export function overlapDays(
  start: Date,
  end: Date,
  rangeStart: Date,
  rangeEnd: Date
) {
  const from = Math.max(startOfDay(start).getTime(), startOfDay(rangeStart).getTime());
  const to = Math.min(startOfDay(end).getTime(), startOfDay(rangeEnd).getTime());
  if (to < from) return 0;
  return Math.floor((to - from) / (24 * 60 * 60 * 1000)) + 1;
}

export function attendanceRate(present: number, absent: number): number | null {
  const denom = present + absent;
  if (denom <= 0) return null;
  return Math.round((present / denom) * 100);
}

export function hoursFromMinutes(minutes: number) {
  return Math.round((Math.max(0, minutes) / 60) * 10) / 10;
}
