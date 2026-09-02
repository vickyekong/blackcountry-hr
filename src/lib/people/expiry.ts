import { differenceInCalendarDays } from "date-fns";

export const EXPIRY_ALERT_DAYS = 60;

export type ExpiryAlert = "expired" | "soon";

export function expiryAlert(
  expiresAt: Date | null | undefined,
  now: Date = new Date()
): ExpiryAlert | null {
  if (!expiresAt) return null;
  const days = differenceInCalendarDays(expiresAt, now);
  if (days < 0) return "expired";
  if (days <= EXPIRY_ALERT_DAYS) return "soon";
  return null;
}

export function daysUntilExpiry(
  expiresAt: Date,
  now: Date = new Date()
): number {
  return differenceInCalendarDays(expiresAt, now);
}
