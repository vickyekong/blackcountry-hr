import { env, nextAuthSecret } from "@/lib/env";

/** Canonical public origin — never return an empty string (NextAuth `new URL("")` fails the Vercel build). */
export function getAppBaseUrl(): string {
  const explicit = env("NEXTAUTH_URL");
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = env("VERCEL_URL");
  if (vercel) {
    return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

/** Runtime lookup so Vercel Sensitive secrets are not baked in as "" at build. */
export function ensureAuthUrlEnv() {
  process.env["NEXTAUTH_URL"] = getAppBaseUrl();
  const secret = nextAuthSecret();
  if (secret) {
    process.env["NEXTAUTH_SECRET"] = secret;
  }
}
