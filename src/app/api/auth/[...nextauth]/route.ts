import { NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensureAuthUrlEnv } from "@/lib/app-url";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function handler(
  req: NextRequest,
  context: { params: { nextauth: string[] } }
) {
  ensureAuthUrlEnv();
  return NextAuth(req, context, authOptions);
}

export { handler as GET, handler as POST };
