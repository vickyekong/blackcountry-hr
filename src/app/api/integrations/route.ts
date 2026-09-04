import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, requirePermission } from "@/lib/api-auth";
import { ensureIntegrationsSchema } from "@/lib/ensure-integrations-schema";
import { INTEGRATION_CATALOG } from "@/lib/integrations/catalog";
import { WEBHOOK_EVENTS, parseWebhookEvents } from "@/lib/integrations/events";
import { secretSuffix } from "@/lib/integrations/url";

export async function GET() {
  try {
    const session = await requirePermission("manageCompanySettings");
    await ensureIntegrationsSchema();
    const [google, microsoft, webhooks] = await Promise.all([
      prisma.googleDriveIntegration.findUnique({
        where: { companyId: session.user.companyId },
        select: { email: true, connectedAt: true },
      }),
      prisma.microsoftWorkspaceIntegration.findUnique({
        where: { companyId: session.user.companyId },
        select: { email: true, connectedAt: true },
      }),
      prisma.webhookEndpoint.findMany({
        where: { companyId: session.user.companyId },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return NextResponse.json({
      catalog: INTEGRATION_CATALOG,
      events: WEBHOOK_EVENTS,
      connections: {
        google: Boolean(google),
        googleEmail: google?.email ?? null,
        microsoft: Boolean(microsoft),
        microsoftEmail: microsoft?.email ?? null,
      },
      webhooks: webhooks.map((row) => ({
        id: row.id,
        name: row.name,
        url: row.url,
        secretSuffix: secretSuffix(row.secret),
        events: parseWebhookEvents(row.events),
        enabled: row.enabled,
        lastStatus: row.lastStatus,
        lastError: row.lastError,
        lastFiredAt: row.lastFiredAt,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
