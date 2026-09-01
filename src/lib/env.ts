/**
 * Runtime env access that Next.js webpack does not inline.
 * `process.env.FOO` is replaced at build with "" when the var is a Vercel
 * Sensitive secret (unavailable at build). Bracket + env() keeps a live lookup.
 */
export function env(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function envFirst(...names: string[]): string | undefined {
  for (const name of names) {
    const value = env(name);
    if (value) return value;
  }
  return undefined;
}

/** Public self-serve signup. Off in production unless SIGNUP_ENABLED=true. */
export function isSignupEnabled(): boolean {
  const flag = env("SIGNUP_ENABLED");
  if (flag === "true") return true;
  if (flag === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export function nextAuthSecret(): string | undefined {
  return envFirst("NEXTAUTH_SECRET", "AUTH_SECRET");
}

export function databaseUrl(): string | undefined {
  return envFirst("DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL");
}
