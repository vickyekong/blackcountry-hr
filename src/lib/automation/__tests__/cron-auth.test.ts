import { afterEach, describe, expect, it } from "vitest";
import { AuthError } from "@/lib/api-auth";
import { assertCronRequest } from "@/lib/automation/cron-auth";

function req(authorization?: string) {
  return new Request("http://localhost/api/cron/daily", {
    headers: authorization ? { authorization } : undefined,
  });
}

describe("cron auth", () => {
  const previous = process.env.CRON_SECRET;

  afterEach(() => {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  });

  it("accepts a matching bearer token", () => {
    process.env.CRON_SECRET = "test-cron";
    expect(() => assertCronRequest(req("Bearer test-cron"))).not.toThrow();
  });

  it("rejects a mismatch", () => {
    process.env.CRON_SECRET = "test-cron";
    expect(() => assertCronRequest(req("Bearer nope"))).toThrow(AuthError);
  });
});
