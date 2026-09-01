/** @type {import('next').NextConfig} */

function resolveAuthUrl() {
  const explicit = process.env["NEXTAUTH_URL"]?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env["VERCEL_URL"]?.trim();
  if (vercel) {
    return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

// NextAuth's client module calls `new URL(NEXTAUTH_URL)` at import time.
// An empty env var on Vercel crashes static generation of every page.
// Do NOT assign a placeholder NEXTAUTH_SECRET here — webpack would inline it
// and production would never see the real Vercel Sensitive secret.
process.env["NEXTAUTH_URL"] = resolveAuthUrl();

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
      // Keep next-auth unbundled so `process.env.NEXTAUTH_SECRET` is a live
      // runtime read, not an empty string inlined at build (Vercel Sensitive).
      "next-auth",
    ],
  },
};

export default nextConfig;
