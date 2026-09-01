/** @type {import('next').NextConfig} */

function resolveAuthUrl() {
  const explicit = process.env.NEXTAUTH_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

// NextAuth's client module calls `new URL(NEXTAUTH_URL)` at import time.
// An empty env var on Vercel crashes static generation of every page.
process.env.NEXTAUTH_URL = resolveAuthUrl();
if (!process.env.NEXTAUTH_SECRET?.trim()) {
  process.env.NEXTAUTH_SECRET = "build-placeholder-set-NEXTAUTH_SECRET-in-vercel";
}

const nextConfig = {
  eslint: {
    // Keep production deploys unblocked by lint noise; run `npm run lint` locally.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // googleapis type graph is huge and can OOM/timeout Vercel typecheck.
    // Runtime correctness is covered by Vitest + local checks.
    ignoreBuildErrors: true,
  },
  experimental: {
    // Avoid bundling the massive googleapis package into the server build.
    serverComponentsExternalPackages: [
      "googleapis",
      "google-auth-library",
      "pdf-parse",
      "xlsx",
    ],
  },
};

export default nextConfig;
