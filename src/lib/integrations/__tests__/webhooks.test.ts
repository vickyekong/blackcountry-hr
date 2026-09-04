import { describe, expect, it } from "vitest";
import { parseWebhookEvents } from "@/lib/integrations/events";
import { buildWebhookEnvelope } from "@/lib/integrations/payload";
import { signWebhookBody, webhookSignatureMatches } from "@/lib/integrations/sign";
import { assertWebhookUrl } from "@/lib/integrations/url";
import { INTEGRATION_CATALOG } from "@/lib/integrations/catalog";

describe("outbound webhooks", () => {
  it("signs and verifies the raw JSON body", () => {
    const body = JSON.stringify({ event: "payroll.paid" });
    const header = signWebhookBody("secret-one", body);
    expect(webhookSignatureMatches("secret-one", body, header)).toBe(true);
    expect(webhookSignatureMatches("secret-two", body, header)).toBe(false);
  });

  it("never puts net pay, bank, or TIN on the envelope", () => {
    const envelope = buildWebhookEnvelope({
      id: "d1",
      event: "payroll.paid",
      companyId: "c1",
      entityType: "PayrollRun",
      entityId: "r1",
      data: {
        periodMonth: 9,
        netPayKobo: 88000000n,
        bankAccountNumber: "0123456789",
        tin: "123",
        status: "PAID",
      },
    });
    expect(envelope.data.status).toBe("PAID");
    expect(envelope.data.periodMonth).toBe(9);
    expect(envelope.data.netPayKobo).toBeUndefined();
    expect(envelope.data.bankAccountNumber).toBeUndefined();
    expect(envelope.data.tin).toBeUndefined();
  });

  it("drops unknown event names", () => {
    expect(parseWebhookEvents(["payroll.paid", "hack.me", 1])).toEqual([
      "payroll.paid",
    ]);
  });

  it("requires https except local http", () => {
    expect(assertWebhookUrl("https://hooks.example.com/hr")).toContain("https://");
    expect(() => assertWebhookUrl("http://hooks.example.com/hr")).toThrow(
      /HTTPS/
    );
  });

  it("lists live Google, Microsoft, clock, and webhooks without new products", () => {
    const ids = INTEGRATION_CATALOG.map((item) => item.id);
    expect(ids).toContain("google-workspace");
    expect(ids).toContain("microsoft-365");
    expect(ids).toContain("clock");
    expect(ids).toContain("webhooks");
    expect(INTEGRATION_CATALOG.find((item) => item.id === "slack")?.status).toBe(
      "via_webhook"
    );
  });
});
