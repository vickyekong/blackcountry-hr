"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand";
import { BrandStripe } from "@/components/brand/brand-stripe";

export function LoginForm({ signupEnabled }: { signupEnabled: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="grid min-h-screen min-h-dvh lg:grid-cols-2">
      <div className="relative hidden bg-login-atmosphere px-10 py-12 text-foam lg:flex lg:flex-col lg:justify-between">
        <BrandStripe className="absolute inset-x-0 top-0" />
        <p className="mt-2 text-sm font-semibold tracking-tight">{PRODUCT_NAME}</p>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-lagoon">
            Blackcountry Group · issued accounts only
          </p>
          <h1 className="font-marketing mt-4 max-w-md text-4xl font-semibold leading-[1.05] tracking-tight">
            Five portals. One payroll truth.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
            {PRODUCT_TAGLINE}. Super Admin, HR, Finance, business heads, and
            Staff each have their own door — this is not a public product.
          </p>
        </div>
        <p className="text-xs text-white/35">Private workspace · not for the open market</p>
      </div>

      <div className="flex items-center justify-center bg-mist px-4 py-10 sm:px-8">
        <div className="animate-fade-up w-full max-w-sm">
          <p className="mb-8 text-sm font-semibold tracking-tight text-ink lg:hidden">
            {PRODUCT_NAME}
          </p>
          <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-line bg-foam p-5 shadow-panel sm:p-6"
          >
            <p className="text-base font-semibold text-ink">Sign in</p>
            <p className="mt-1 text-xs text-muted">
              Sign in with the account HR issued for your company
            </p>
            <div className="mt-5 space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@blackcountry.africa"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              {error && <p className="text-sm text-signal">{error}</p>}
              <Button type="submit" variant="brand" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Enter workspace"}
              </Button>
            </div>
          </form>
          {signupEnabled ? (
            <p className="mt-4 text-center text-xs text-muted">
              Internal setup only.{" "}
              <Link href="/signup" className="font-medium text-ink underline underline-offset-2">
                Continue
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
