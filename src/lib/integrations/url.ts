export function assertWebhookUrl(raw: string) {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("Enter a full URL, including https://");
  }
  const local =
    parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol === "http:" && !(process.env.NODE_ENV !== "production" && local)) {
    throw new Error("Webhook URLs must use HTTPS");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Webhook URLs must use HTTPS");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Do not put credentials in the webhook URL");
  }
  return parsed.toString();
}

export function secretSuffix(secret: string) {
  return secret.slice(-4);
}
