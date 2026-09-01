/**
 * Live process.env lookup that Next.js SWC/webpack cannot constant-fold.
 * `process.env.FOO` and `process.env["FOO"]` are replaced at build with ""
 * when the var is a Vercel Sensitive secret (unavailable at build). Walking
 * keys on globalThis.process.env keeps a real runtime read.
 */
function liveProcessEnv(): NodeJS.ProcessEnv {
  return globalThis.process?.env ?? {};
}

export function env(name: string): string | undefined {
  const runtime = liveProcessEnv();
  let value: string | undefined;
  for (const key of Object.keys(runtime)) {
    if (key === name) {
      value = runtime[key];
      break;
    }
  }
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
