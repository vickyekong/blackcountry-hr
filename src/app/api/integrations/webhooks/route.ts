import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requirePermission } from "@/lib/api-auth";
import { ensureIntegrationsSchema } from "@/lib/ensure-integrations-schema";
import { WEBHOOK_EVENTS, parseWebhookEvents } from "@/lib/integrations/events";
import { assertWebhookUrl, secretSuffix } from "@/lib/integrations/url";
import { dispatchWebhooks } from "@/lib/integrations/dispatch";

const MAX_ENDPOINTS = 8;

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  url: z.string().trim().min(8).max(500),
  events: z.array(z.string()).min(1).max(WEBHOOK_EVENTS.length),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("manageCompanySettings");
    await ensureIntegrationsSchema();
    const body = createSchema.parse(await req.json());
    const url = assertWebhookUrl(body.url);
    const events = parseWebhookEvents(body.events);
    if (events.length === 0) {
      return NextResponse.json({ error: "Pick at least one known event" }, { status: 400 });
    }
    const existing = await prisma.webhookEndpoint.count({
      where: { companyId: session.user.companyId },
    });
    if (existing >= MAX_ENDPOINTS) {
      return NextResponse.json(
        { error: `At most ${MAX_ENDPOINTS} webhook endpoints per company` },
        { status: 400 }
      );
    }
    const secret = randomBytes(24).toString("hex");
    const row = await prisma.webhookEndpoint.create({
      data: {
        companyId: session.user.companyId,
        name: body.name,
        url,
        secret,
        events: events,
      },
    });
    await prisma.auditLog.create({
      data: {
        companyId: session.user.companyId,
        action: "CREATE",
        entityType: "WebhookEndpoint",
        entityId: row.id,
        performedById: session.user.id,
        changes: { name: row.name, url: row.url, events },
      },
    });
    return NextResponse.json({
      id: row.id,
      name: row.name,
      url: row.url,
      secret,
      secretSuffix: secretSuffix(secret),
      events: parseWebhookEvents(row.events),
      enabled: row.enabled,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

const patchSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  url: z.string().trim().min(8).max(500).optional(),
  events: z.array(z.string()).min(1).optional(),
  enabled: z.boolean().optional(),
  ping: z.literal(true).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await requirePermission("manageCompanySettings");
    await ensureIntegrationsSchema();
    const body = patchSchema.parse(await req.json());
    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    const existing = await prisma.webhookEndpoint.findFirst({
      where: { id, companyId: session.user.companyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (body.ping) {
      const sent = await dispatchWebhooks({
        companyId: session.user.companyId,
        event: "webhook.ping",
        entityType: "WebhookEndpoint",
        entityId: existing.id,
        data: { name: existing.name },
        endpointId: existing.id,
        ignoreEventFilter: true,
      });
      const updated = await prisma.webhookEndpoint.findFirst({
        where: { id: existing.id },
      });
      return NextResponse.json({
        ok: true,
        sent,
        lastStatus: updated?.lastStatus ?? null,
        lastError: updated?.lastError ?? "",
      });
    }
    const nextEvents = body.events ? parseWebhookEvents(body.events) : undefined;
    if (body.events && (!nextEvents || nextEvents.length === 0)) {
      return NextResponse.json({ error: "Pick at least one known event" }, { status: 400 });
    }
    const url = body.url ? assertWebhookUrl(body.url) : undefined;
    const row = await prisma.webhookEndpoint.update({
      where: { id: existing.id },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(url ? { url } : {}),
        ...(nextEvents ? { events: nextEvents } : {}),
        ...(body.enabled != null ? { enabled: body.enabled } : {}),
      },
    });
    await prisma.auditLog.create({
      data: {
        companyId: session.user.companyId,
        action: "UPDATE",
        entityType: "WebhookEndpoint",
        entityId: row.id,
        performedById: session.user.id,
        changes: body,
      },
    });
    return NextResponse.json({
      id: row.id,
      name: row.name,
      url: row.url,
      secretSuffix: secretSuffix(row.secret),
      events: parseWebhookEvents(row.events),
      enabled: row.enabled,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requirePermission("manageCompanySettings");
    await ensureIntegrationsSchema();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Not found" }, { status: 400 });
    }
    const existing = await prisma.webhookEndpoint.findFirst({
      where: { id, companyId: session.user.companyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.webhookEndpoint.delete({ where: { id: existing.id } });
    await prisma.auditLog.create({
      data: {
        companyId: session.user.companyId,
        action: "DELETE",
        entityType: "WebhookEndpoint",
        entityId: existing.id,
        performedById: session.user.id,
        changes: { name: existing.name },
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
