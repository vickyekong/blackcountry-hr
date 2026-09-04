import { PRODUCT_NAME } from "@/lib/brand";
import { getAppBaseUrl } from "@/lib/app-url";
import { env } from "@/lib/env";

/**
 * Optional delivery for in-app Notification rows.
 * No-op unless RESEND_API_KEY and EMAIL_FROM are set. Failures are logged;
 * they must not roll back the notification.
 */
export async function sendNotificationEmail(options: {
  to: string;
  subject: string;
  text: string;
  linkUrl?: string | null;
}): Promise<void> {
  const key = env("RESEND_API_KEY");
  const from = env("EMAIL_FROM");
  if (!key || !from) return;
  const to = options.to.trim();
  if (!to.includes("@")) return;

  const link = absoluteLink(options.linkUrl);
  const text = link ? `${options.text}\n\nOpen: ${link}` : options.text;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: options.subject.startsWith(PRODUCT_NAME)
          ? options.subject
          : `${PRODUCT_NAME}: ${options.subject}`,
        text,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("email:", res.status, detail);
    }
  } catch (err) {
    console.error("email:", err);
  }
}

function absoluteLink(linkUrl?: string | null): string | undefined {
  if (!linkUrl) return undefined;
  if (/^https?:\/\//i.test(linkUrl)) return linkUrl;
  const base = getAppBaseUrl();
  return `${base}${linkUrl.startsWith("/") ? "" : "/"}${linkUrl}`;
}
