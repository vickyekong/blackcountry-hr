import { nairaToKobo } from "@/lib/money";

export const STAFF_PROFILE_FIELDS = [
  { key: "sex", label: "Sex" },
  { key: "phone", label: "Phone" },
  { key: "addressLine", label: "Home address" },
  { key: "nextOfKinName", label: "Next of kin" },
  { key: "nextOfKinPhone", label: "Next of kin phone" },
  { key: "bankName", label: "Bank name" },
  { key: "bankAccountNumber", label: "Account number" },
  { key: "tin", label: "TIN" },
] as const;

export type StaffProfileFieldKey = (typeof STAFF_PROFILE_FIELDS)[number]["key"];

/** Fields staff may always save on their own record. */
export const STAFF_ALWAYS_DIRECT_FIELDS = [
  "phone",
  "addressLine",
  "nextOfKinName",
  "nextOfKinPhone",
  "sex",
] as const;

/** First fill is allowed; later edits go through a change request. */
export const STAFF_LOCKED_AFTER_SET_FIELDS = [
  "bankName",
  "bankAccountNumber",
  "tin",
  "rsaPin",
  "nhfNumber",
] as const;

export type StaffLockedField =
  (typeof STAFF_LOCKED_AFTER_SET_FIELDS)[number];

function isBlank(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "bigint") return value === 0n;
  return String(value).trim() === "";
}

export function profileCompleteness(record: Record<string, unknown>): {
  filled: number;
  total: number;
  missing: string[];
  percent: number;
} {
  const missing: string[] = [];
  let filled = 0;
  for (const field of STAFF_PROFILE_FIELDS) {
    if (isBlank(record[field.key])) {
      missing.push(field.label);
    } else {
      filled += 1;
    }
  }
  const total = STAFF_PROFILE_FIELDS.length;
  return {
    filled,
    total,
    missing,
    percent: Math.round((filled / total) * 100),
  };
}

export function isSensitiveFieldLocked(
  current: Record<string, unknown>,
  field: StaffLockedField
): boolean {
  return !isBlank(current[field]);
}

export function annualRentLocked(currentAnnualRentKobo: bigint | number | string): boolean {
  const value =
    typeof currentAnnualRentKobo === "bigint"
      ? currentAnnualRentKobo
      : BigInt(currentAnnualRentKobo || 0);
  return value > 0n;
}

export function nairaStringToKobo(naira: string | number): bigint {
  return nairaToKobo(Number(naira));
}
