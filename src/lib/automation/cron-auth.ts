import { env } from "@/lib/env";
import { AuthError } from "@/lib/api-auth";

export function assertCronRequest(req: Request) {
  const secret = env("CRON_SECRET");
  const header = req.headers.get("authorization") ?? "";
  if (secret) {
    if (header !== `Bearer ${secret}`) {
      throw new AuthError("Unauthorized", 401);
    }
    return;
  }
  if (process.env.NODE_ENV === "production") {
    throw new AuthError("Unauthorized", 401);
  }
}
