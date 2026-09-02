/** Keyword match of required skills against application text. Assistive only. */
export function skillMatchPercent(
  required: string[],
  haystack: string
): { percent: number; matched: string[]; missing: string[] } {
  const names = required
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
  if (names.length === 0) {
    return { percent: 0, matched: [], missing: [] };
  }
  const text = haystack.toLowerCase();
  const matched: string[] = [];
  const missing: string[] = [];
  for (const name of names) {
    if (text.includes(name.toLowerCase())) matched.push(name);
    else missing.push(name);
  }
  return {
    percent: Math.round((matched.length / names.length) * 100),
    matched,
    missing,
  };
}
