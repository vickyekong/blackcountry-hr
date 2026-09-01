import { ensureAuthUrlEnv } from "@/lib/app-url";

export async function register() {
  ensureAuthUrlEnv();
}
