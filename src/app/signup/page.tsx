import Link from "next/link";
import { isSignupEnabled } from "@/lib/env";
import { PRODUCT_NAME } from "@/lib/brand";
import { SignupForm } from "./signup-form";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  if (!isSignupEnabled()) {
    return (
      <div className="relative flex min-h-screen min-h-dvh items-center justify-center bg-atmosphere px-4 text-ink">
        <div className="max-w-md text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted">
            Invite only
          </p>
          <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight">
            Signup is closed
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {PRODUCT_NAME} workspaces are created by Super Admin. Ask yours for
            an invite, or sign in if you already have an account.
          </p>
          <p className="mt-6">
            <Link
              href="/login"
              className="font-medium text-ok underline underline-offset-2"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return <SignupForm />;
}
