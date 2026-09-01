/** Canonical public origin — never return an empty string (NextAuth `new URL("")` fails the Vercel build). */
export function getAppBaseUrl(): string {
  const explicit = process.env.NEXTAUTH_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

export function ensureAuthUrlEnv() {
  process.env.NEXTAUTH_URL = getAppBaseUrl();
}
