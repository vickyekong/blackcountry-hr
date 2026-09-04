import type { WebhookEvent } from "@/lib/integrations/events";

const BLOCKED_KEYS = [
  "password",
  "passwordHash",
  "refreshToken",
  "secret",
  "tin",
  "rsaPin",
  "bankAccountNumber",
  "bankName",
  "basicSalaryKobo",
  "netPayKobo",
  "grossPayKobo",
  "housingAllowanceKobo",
  "transportAllowanceKobo",
];

export type WebhookEnvelope = {
  id: string;
  event: WebhookEvent;
  companyId: string;
  occurredAt: string;
  entityType: string;
  entityId: string;
  data: Record<string, unknown>;
};

function stripBlocked(input: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (BLOCKED_KEYS.includes(key)) continue;
    if (typeof value === "bigint") {
      out[key] = value.toString();
      continue;
    }
    if (value instanceof Date) {
      out[key] = value.toISOString();
      continue;
    }
    if (value !== null && typeof value === "object") continue;
    out[key] = value;
  }
  return out;
}

export function buildWebhookEnvelope(options: {
  id: string;
  event: WebhookEvent;
  companyId: string;
  entityType: string;
  entityId: string;
  occurredAt?: Date;
  data?: Record<string, unknown>;
}): WebhookEnvelope {
  return {
    id: options.id,
    event: options.event,
    companyId: options.companyId,
    occurredAt: (options.occurredAt ?? new Date()).toISOString(),
    entityType: options.entityType,
    entityId: options.entityId,
    data: stripBlocked(options.data ?? {}),
  };
}
