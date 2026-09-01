import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { homePathForRole } from "@/lib/permissions";
import { LandingPage } from "@/components/marketing/landing-page";
import { isSignupEnabled } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function Home() {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch (error) {
    console.error("[home] session lookup failed", error);
  }
  if (session?.user?.role) {
    redirect(homePathForRole(session.user.role));
  }
  return <LandingPage signupEnabled={isSignupEnabled()} />;
}
