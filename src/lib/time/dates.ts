/** Local calendar day key (avoid UTC shift from toISOString). */
export function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse YYYY-MM-DD as noon local time so the calendar day is stable. */
export function parseLocalDay(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) throw new Error("Invalid date");
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function holidayKeySet(
  dates: Iterable<Date | string>
): Set<string> {
  const keys = new Set<string>();
  for (const value of dates) {
    keys.add(typeof value === "string" ? value.slice(0, 10) : localDateKey(value));
  }
  return keys;
}
