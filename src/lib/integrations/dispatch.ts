import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { ensureIntegrationsSchema } from "@/lib/ensure-integrations-schema";
import { parseWebhookEvents, type WebhookEvent } from "@/lib/integrations/events";
import { buildWebhookEnvelope } from "@/lib/integrations/payload";
import { signWebhookBody } from "@/lib/integrations/sign";

const TIMEOUT_MS = 4000;

export async function dispatchWebhooks(options: {
  companyId: string;
  event: WebhookEvent;
  entityType: string;
  entityId: string;
  data?: Record<string, unknown>;
  endpointId?: string;
  ignoreEventFilter?: boolean;
}) {
  await ensureIntegrationsSchema();
  const endpoints = options.endpointId
    ? await prisma.webhookEndpoint.findMany({
        where: {
          id: options.endpointId,
          companyId: options.companyId,
          enabled: true,
        },
      })
    : await prisma.webhookEndpoint.findMany({
        where: { companyId: options.companyId, enabled: true },
      });
  if (endpoints.length === 0) return 0;

  let sent = 0;
  for (const endpoint of endpoints) {
    const events = parseWebhookEvents(endpoint.events);
    if (!options.ignoreEventFilter && !events.includes(options.event)) continue;
    const envelope = buildWebhookEnvelope({
      id: randomUUID(),
      event: options.event,
      companyId: options.companyId,
      entityType: options.entityType,
      entityId: options.entityId,
      data: options.data,
    });
    const body = JSON.stringify(envelope);
    const signature = signWebhookBody(endpoint.secret, body);
    try {
      const res = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Blackcountry-HR-System-webhooks",
          "X-Blackcountry-Event": options.event,
          "X-Blackcountry-Signature": signature,
          "X-Blackcountry-Delivery": envelope.id,
        },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const errText = res.ok ? "" : (await res.text()).slice(0, 180);
      await prisma.webhookEndpoint.update({
        where: { id: endpoint.id },
        data: {
          lastStatus: res.status,
          lastError: errText,
          lastFiredAt: new Date(),
        },
      });
      if (res.ok) sent += 1;
    } catch (error) {
      await prisma.webhookEndpoint.update({
        where: { id: endpoint.id },
        data: {
          lastStatus: 0,
          lastError:
            error instanceof Error ? error.message.slice(0, 180) : "Request failed",
          lastFiredAt: new Date(),
        },
      });
    }
  }
  return sent;
}

export function emitPlatformEvent(options: {
  companyId: string;
  event: WebhookEvent;
  entityType: string;
  entityId: string;
  data?: Record<string, unknown>;
}) {
  void dispatchWebhooks(options).catch((error) => {
    console.error("webhook dispatch", error);
  });
}
