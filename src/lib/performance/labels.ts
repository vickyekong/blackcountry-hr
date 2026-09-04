export const GOAL_SCOPES = ["COMPANY", "DEPARTMENT", "INDIVIDUAL"] as const;
export type GoalScope = (typeof GOAL_SCOPES)[number];

export const GOAL_SCOPE_LABELS: Record<GoalScope, string> = {
  COMPANY: "Company",
  DEPARTMENT: "Department",
  INDIVIDUAL: "Individual",
};

export const REVIEW_PERIODS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
  "Q1",
  "Q2",
  "Q3",
  "Q4",
  "H1",
  "H2",
  "ANNUAL",
] as const;
export type ReviewPeriod = (typeof REVIEW_PERIODS)[number];

export const REVIEW_PERIOD_GROUPS: Array<{
  label: string;
  ids: ReviewPeriod[];
}> = [
  {
    label: "Monthly",
    ids: [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC",
    ],
  },
  { label: "Quarterly", ids: ["Q1", "Q2", "Q3", "Q4"] },
  { label: "Biannual", ids: ["H1", "H2"] },
  { label: "Annual", ids: ["ANNUAL"] },
];

export const REVIEW_PERIOD_LABELS: Record<ReviewPeriod, string> = {
  JAN: "January",
  FEB: "February",
  MAR: "March",
  APR: "April",
  MAY: "May",
  JUN: "June",
  JUL: "July",
  AUG: "August",
  SEP: "September",
  OCT: "October",
  NOV: "November",
  DEC: "December",
  Q1: "Q1",
  Q2: "Q2",
  Q3: "Q3",
  Q4: "Q4",
  H1: "First half",
  H2: "Second half",
  ANNUAL: "Annual",
};

export function reviewPeriodLabel(period: string): string {
  return REVIEW_PERIOD_LABELS[period as ReviewPeriod] ?? period;
}

export const RECOGNITION_KINDS = [
  "PERFORMANCE",
  "TEAMWORK",
  "INNOVATION",
  "LEADERSHIP",
  "CUSTOMER_SERVICE",
] as const;
export type RecognitionKind = (typeof RECOGNITION_KINDS)[number];

export const RECOGNITION_KIND_LABELS: Record<RecognitionKind, string> = {
  PERFORMANCE: "Performance",
  TEAMWORK: "Teamwork",
  INNOVATION: "Innovation",
  LEADERSHIP: "Leadership",
  CUSTOMER_SERVICE: "Customer service",
};

export function recognitionKindLabel(kind: string): string {
  return RECOGNITION_KIND_LABELS[kind as RecognitionKind] ?? kind;
}
