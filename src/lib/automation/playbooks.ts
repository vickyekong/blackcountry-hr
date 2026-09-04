export const WORKFLOW_PLAYBOOKS = [
  {
    id: "LEAVE",
    title: "Leave request",
    href: "/leave",
    steps: [
      "Staff submits the request",
      "HR or Super Admin approves or sends it back",
      "Annual leave reduces the balance when approved",
    ],
  },
  {
    id: "EXPENSE",
    title: "Expense claim",
    href: "/expenses",
    steps: [
      "Staff submits a claim to HR and Super Admin",
      "Line manager or HR up to ₦100,000; HR up to ₦500,000; Super Admin above that",
      "Finance reimburses on the Finance portal — payroll, transfer, or cash",
    ],
  },
  {
    id: "PAYROLL",
    title: "Payroll run",
    href: "/payroll",
    steps: [
      "HR drafts the run from weekly timesheets",
      "HR submits for Super Admin approval",
      "After clearance, HR forwards to Finance to process",
    ],
  },
  {
    id: "SALARY_CHANGE",
    title: "Salary / bank change",
    href: "/hr-ask?tab=changes",
    steps: [
      "Staff or HR raises a change request",
      "HR reviews general updates",
      "Super Admin clears bank and tax-relief changes",
    ],
  },
  {
    id: "ADVANCE",
    title: "Salary advance",
    href: "/payroll?tab=advances",
    steps: ["Staff requests", "HR or Super Admin approves", "Repayment comes off the payslip"],
  },
  {
    id: "LOAN",
    title: "Staff loan",
    href: "/payroll?tab=loans",
    steps: ["HR records the loan", "Super Admin or HR approves", "Instalments attach on draft runs"],
  },
  {
    id: "OVERTIME",
    title: "Overtime",
    href: "/timesheets?tab=overtime",
    steps: [
      "Staff or HR logs overtime against a day",
      "HR approves",
      "Approved overtime attaches on the draft payroll run",
    ],
  },
  {
    id: "TIMESHEET",
    title: "Timesheet week",
    href: "/timesheets",
    steps: [
      "Staff logs hours on a project and task",
      "HR validates the week",
      "Validated hours are the source of time for payroll",
    ],
  },
] as const;

export type WorkflowPlaybookId = (typeof WORKFLOW_PLAYBOOKS)[number]["id"];

export const AUTOMATION_ALERT_KEYS = [
  "expiry",
  "timesheets",
  "reviews",
  "approvals",
  "payroll",
  "compliance",
] as const;
export type AutomationAlertKey = (typeof AUTOMATION_ALERT_KEYS)[number];

export type AutomationAlerts = Record<AutomationAlertKey, boolean>;

export type AutomationSettingsInput = {
  expiryLeadDays: number;
  reviewLeadDays: number;
  payrollReminderDay: number;
  alerts: AutomationAlerts;
};

export const DEFAULT_AUTOMATION_SETTINGS: AutomationSettingsInput = {
  expiryLeadDays: 60,
  reviewLeadDays: 14,
  payrollReminderDay: 25,
  alerts: {
    expiry: true,
    timesheets: true,
    reviews: true,
    approvals: true,
    payroll: true,
    compliance: true,
  },
};

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function parseAutomationSettings(
  raw: {
    expiryLeadDays?: number | null;
    reviewLeadDays?: number | null;
    payrollReminderDay?: number | null;
    alerts?: unknown;
  } | null
): AutomationSettingsInput {
  const alertsRaw =
    raw?.alerts && typeof raw.alerts === "object"
      ? (raw.alerts as Record<string, unknown>)
      : {};
  const alerts = { ...DEFAULT_AUTOMATION_SETTINGS.alerts };
  for (const key of AUTOMATION_ALERT_KEYS) {
    if (typeof alertsRaw[key] === "boolean") alerts[key] = alertsRaw[key];
  }
  return {
    expiryLeadDays: clampInt(
      raw?.expiryLeadDays,
      1,
      365,
      DEFAULT_AUTOMATION_SETTINGS.expiryLeadDays
    ),
    reviewLeadDays: clampInt(
      raw?.reviewLeadDays,
      1,
      90,
      DEFAULT_AUTOMATION_SETTINGS.reviewLeadDays
    ),
    payrollReminderDay: clampInt(
      raw?.payrollReminderDay,
      1,
      28,
      DEFAULT_AUTOMATION_SETTINGS.payrollReminderDay
    ),
    alerts,
  };
}

export function inLeadWindow(
  at: Date,
  leadDays: number,
  now = new Date()
): boolean {
  const ms = at.getTime() - now.getTime();
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  return days <= leadDays;
}

export function isOverdue(at: Date, now = new Date()) {
  return at.getTime() < now.getTime();
}

export function shouldSendPayrollReminder(options: {
  dayOfMonth: number;
  reminderDay: number;
  hasApprovedRunThisMonth: boolean;
}) {
  if (options.hasApprovedRunThisMonth) return false;
  return options.dayOfMonth >= options.reminderDay;
}

export type InboxKind =
  | "leave"
  | "expense"
  | "payroll"
  | "change"
  | "advance"
  | "loan"
  | "overtime"
  | "timesheet"
  | "recruitment";

export function inboxKindsForRole(role: string): InboxKind[] {
  if (role === "SUPER_ADMIN") {
    return [
      "leave",
      "expense",
      "payroll",
      "change",
      "advance",
      "loan",
      "overtime",
      "timesheet",
      "recruitment",
    ];
  }
  if (role === "HR_ADMIN") {
    return [
      "leave",
      "expense",
      "change",
      "advance",
      "loan",
      "overtime",
      "timesheet",
      "recruitment",
    ];
  }
  if (role === "BUSINESS_HEAD") {
    return ["expense"];
  }
  return [];
}
