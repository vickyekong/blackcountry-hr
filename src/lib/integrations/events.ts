export const WEBHOOK_EVENTS = [
  "payroll.submitted",
  "payroll.approved",
  "payroll.forwarded",
  "payroll.paid",
  "leave.approved",
  "leave.rejected",
  "expense.approved",
  "employee.created",
  "timesheet.validated",
  "webhook.ping",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export function isWebhookEvent(value: string): value is WebhookEvent {
  return (WEBHOOK_EVENTS as readonly string[]).includes(value);
}

export function parseWebhookEvents(raw: unknown): WebhookEvent[] {
  const list = Array.isArray(raw) ? raw : [];
  return list.filter((item): item is WebhookEvent => typeof item === "string" && isWebhookEvent(item));
}
