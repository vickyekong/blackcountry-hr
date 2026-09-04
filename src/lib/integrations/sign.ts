import { createHmac, timingSafeEqual } from "crypto";

export function signWebhookBody(secret: string, body: string) {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

export function webhookSignatureMatches(
  secret: string,
  body: string,
  header: string | null | undefined
) {
  if (!header) return false;
  const expected = signWebhookBody(secret, body);
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
