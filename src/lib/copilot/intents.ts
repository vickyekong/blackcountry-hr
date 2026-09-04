export const COPILOT_INTENTS = [
  "late_repeat",
  "dept_payroll_cost",
  "payroll_why_up",
  "contract_expiry",
  "outstanding_loans",
  "missing_timesheets",
  "turnover",
  "salary_simulate",
  "dept_overtime",
  "declining_performance",
  "briefing",
  "unknown",
] as const;

export type CopilotIntent = (typeof COPILOT_INTENTS)[number];

export type CopilotParse = {
  intent: CopilotIntent;
  lateMin: number;
  expiryDays: number;
  salaryIncreaseBps: number;
};

const DEFAULT: Omit<CopilotParse, "intent"> = {
  lateMin: 5,
  expiryDays: 60,
  salaryIncreaseBps: 1000,
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  thirty: 30,
  sixty: 60,
};

function parseCount(raw: string | undefined): number | null {
  if (!raw) return null;
  if (NUMBER_WORDS[raw] != null) return NUMBER_WORDS[raw];
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function firstCount(re: RegExp, text: string): number | null {
  const m = text.match(re);
  if (!m) return null;
  return parseCount(m[1] ?? m[2]);
}

function normalize(question: string) {
  return question.toLowerCase().replace(/\s+/g, " ").trim();
}

export function parseCopilotQuestion(question: string): CopilotParse {
  const q = normalize(question);
  const percent = firstCount(/(\d+(?:\.\d+)?)\s*(?:%|percent)/, q);
  const countToken = "(\\d+|one|two|three|four|five|six|seven|eight|nine|ten|thirty|sixty)";
  const lateMin =
    firstCount(new RegExp(`more than ${countToken}`), q) ??
    firstCount(new RegExp(`${countToken}\\s+times`), q) ??
    DEFAULT.lateMin;
  const expiryDays =
    firstCount(new RegExp(`within ${countToken}`), q) ??
    firstCount(new RegExp(`${countToken}\\s+days`), q) ??
    DEFAULT.expiryDays;
  const salaryIncreaseBps =
    percent != null
      ? Math.round(Math.min(100, Math.max(0, percent)) * 100)
      : DEFAULT.salaryIncreaseBps;

  return {
    intent: classifyIntent(q),
    lateMin: Math.min(31, Math.max(1, Math.round(lateMin))),
    expiryDays: Math.min(365, Math.max(1, Math.round(expiryDays))),
    salaryIncreaseBps: Math.min(10000, Math.max(100, salaryIncreaseBps)),
  };
}

function classifyIntent(q: string): CopilotIntent {
  if (
    /(what would happen|if salaries|salary increase|increase(d)? by|simulate)/.test(
      q
    ) &&
    /(payroll|salar|pay)/.test(q)
  ) {
    return "salary_simulate";
  }
  if (/turnover/.test(q)) return "turnover";
  if (
    /timesheet/.test(q) &&
    /(not|missing|haven'?t|has not|who has not|outstanding|submit)/.test(q)
  ) {
    return "missing_timesheets";
  }
  if (/\bloans?\b/.test(q)) return "outstanding_loans";
  if (/contract/.test(q) && /(expir|end|due)/.test(q)) {
    return "contract_expiry";
  }
  if (/overtime/.test(q)) return "dept_overtime";
  if (
    /payroll/.test(q) &&
    /(why|increas|went up|higher|up this month|rose)/.test(q)
  ) {
    return "payroll_why_up";
  }
  if (
    /(department|dept)/.test(q) &&
    /(payroll|cost|highest|expensive)/.test(q)
  ) {
    return "dept_payroll_cost";
  }
  if (/\blate\b/.test(q)) return "late_repeat";
  if (
    /performance/.test(q) &&
    /(declin|drop|lowest|behind|poor|under)/.test(q)
  ) {
    return "declining_performance";
  }
  if (
    /(briefing|brief me|summary|what should i (know|watch)|insights|watchlist)/.test(
      q
    )
  ) {
    return "briefing";
  }
  return "unknown";
}

export const COPILOT_PROMPTS: Array<{
  intent: Exclude<CopilotIntent, "unknown">;
  text: string;
}> = [
  {
    intent: "late_repeat",
    text: "Who has been late more than five times this month?",
  },
  {
    intent: "dept_payroll_cost",
    text: "Which department has the highest payroll cost?",
  },
  {
    intent: "payroll_why_up",
    text: "Why did payroll increase this month?",
  },
  {
    intent: "contract_expiry",
    text: "Which employee contracts expire within 60 days?",
  },
  {
    intent: "outstanding_loans",
    text: "Which employees have outstanding loans?",
  },
  {
    intent: "missing_timesheets",
    text: "Who has not submitted their timesheet?",
  },
  {
    intent: "turnover",
    text: "What is our current employee turnover rate?",
  },
  {
    intent: "salary_simulate",
    text: "What would happen to payroll if salaries increased by 10%?",
  },
  {
    intent: "dept_overtime",
    text: "Which departments have the highest overtime?",
  },
  {
    intent: "declining_performance",
    text: "Which employees have declining performance?",
  },
  {
    intent: "briefing",
    text: "What should I watch this week?",
  },
];
