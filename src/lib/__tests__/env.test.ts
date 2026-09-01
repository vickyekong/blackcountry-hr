import { afterEach, describe, expect, it } from "vitest";
import { env, isSignupEnabled, nextAuthSecret } from "@/lib/env";

describe("env", () => {
  const previousSecret = process.env.NEXTAUTH_SECRET;

  afterEach(() => {
    delete process.env.SIGNUP_ENABLED;
    delete process.env.LAYER3_ENV_PROBE;
    if (previousSecret === undefined) delete process.env.NEXTAUTH_SECRET;
    else process.env.NEXTAUTH_SECRET = previousSecret;
  });

  it("reads trimmed live env and treats blank as unset", () => {
    process.env.LAYER3_ENV_PROBE = "  hello  ";
    expect(env("LAYER3_ENV_PROBE")).toBe("hello");
    process.env.LAYER3_ENV_PROBE = "   ";
    expect(env("LAYER3_ENV_PROBE")).toBeUndefined();
  });

  it("honours SIGNUP_ENABLED over NODE_ENV", () => {
    process.env.SIGNUP_ENABLED = "false";
    expect(isSignupEnabled()).toBe(false);
    process.env.SIGNUP_ENABLED = "true";
    expect(isSignupEnabled()).toBe(true);
  });

  it("reads NEXTAUTH_SECRET at runtime via key walk", () => {
    process.env.NEXTAUTH_SECRET = "  runtime-secret  ";
    expect(nextAuthSecret()).toBe("runtime-secret");
  });
});
