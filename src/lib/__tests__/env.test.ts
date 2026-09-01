import { afterEach, describe, expect, it } from "vitest";
import { env, isSignupEnabled } from "@/lib/env";

describe("env", () => {
  afterEach(() => {
    delete process.env.SIGNUP_ENABLED;
    delete process.env.LAYER3_ENV_PROBE;
  });

  it("reads trimmed bracket env and treats blank as unset", () => {
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
});
