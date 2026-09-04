export type GoalMetrics = {
  target: string;
  actual: string;
  targetValue?: number | null;
  actualValue?: number | null;
  weight?: number;
};

export function parseMetric(
  value: string | number | null | undefined
): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (value == null) return null;
  const trimmed = String(value).replace(/,/g, "").trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function resolvedTarget(goal: GoalMetrics): number | null {
  if (goal.targetValue != null && Number.isFinite(goal.targetValue)) {
    return goal.targetValue;
  }
  return parseMetric(goal.target);
}

export function resolvedActual(goal: GoalMetrics): number | null {
  if (goal.actualValue != null && Number.isFinite(goal.actualValue)) {
    return goal.actualValue;
  }
  return parseMetric(goal.actual);
}

/** 620 actual / 500 target → 124. Both zero → 100. Target zero otherwise → null. */
export function achievementPercent(goal: GoalMetrics): number | null {
  const target = resolvedTarget(goal);
  const actual = resolvedActual(goal);
  if (target == null || actual == null) return null;
  if (target === 0) return actual === 0 ? 100 : null;
  return Math.round((actual / target) * 100);
}

export function weightedAchievement(goals: GoalMetrics[]): number | null {
  let weight = 0;
  let acc = 0;
  for (const goal of goals) {
    const pct = achievementPercent(goal);
    if (pct == null) continue;
    const w = Math.max(0, goal.weight ?? 0);
    if (w === 0) continue;
    weight += w;
    acc += pct * w;
  }
  return weight ? Math.round(acc / weight) : null;
}

export function suggestedFinalScore(
  scores: Array<number | null | undefined>
): number | null {
  const nums = scores.filter(
    (s): s is number => typeof s === "number" && Number.isFinite(s)
  );
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

export function metricFieldsFromText(target: string, actual: string) {
  return {
    target,
    actual,
    targetValue: parseMetric(target),
    actualValue: parseMetric(actual),
  };
}

export function enrichGoal<T extends GoalMetrics>(goal: T) {
  return {
    ...goal,
    achievementPercent: achievementPercent(goal),
  };
}
