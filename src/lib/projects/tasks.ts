export const DEFAULT_PROJECT_TASK = "General";

/** Unique trimmed task names; always at least General so timesheets have a task. */
export function parseTaskNames(raw: string[] | undefined | null): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const value of raw ?? []) {
    const name = value.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names.length ? names : [DEFAULT_PROJECT_TASK];
}
