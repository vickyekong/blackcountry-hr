export const BENEFIT_KINDS = [
  "MEDICAL",
  "INSURANCE",
  "TRANSPORT",
  "HOUSING",
  "OTHER",
] as const;
export type BenefitKind = (typeof BENEFIT_KINDS)[number];

export const BENEFIT_KIND_LABELS: Record<BenefitKind, string> = {
  MEDICAL: "Medical",
  INSURANCE: "Insurance",
  TRANSPORT: "Transport",
  HOUSING: "Housing",
  OTHER: "Other benefit",
};

export const DEDUCTION_KINDS = ["COOPERATIVE", "UNION", "OTHER"] as const;
export type DeductionKind = (typeof DEDUCTION_KINDS)[number];

export const DEDUCTION_KIND_LABELS: Record<DeductionKind, string> = {
  COOPERATIVE: "Cooperative",
  UNION: "Union",
  OTHER: "Other deduction",
};

export const MONEY_REQUEST_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CLEARED",
] as const;
export type MoneyRequestStatus = (typeof MONEY_REQUEST_STATUSES)[number];

export const MONEY_REQUEST_STATUS_LABELS: Record<MoneyRequestStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CLEARED: "Cleared",
};

export const REMITTANCE_KINDS = ["PAYE", "PENSION", "NHF", "NSITF"] as const;
export type RemittanceKind = (typeof REMITTANCE_KINDS)[number];

export const REMITTANCE_KIND_LABELS: Record<RemittanceKind, string> = {
  PAYE: "PAYE",
  PENSION: "Pension",
  NHF: "NHF",
  NSITF: "NSITF",
};

export function benefitKindLabel(kind: string) {
  return BENEFIT_KIND_LABELS[kind as BenefitKind] ?? kind;
}

export function deductionKindLabel(kind: string) {
  return DEDUCTION_KIND_LABELS[kind as DeductionKind] ?? kind;
}

export function moneyRequestStatusLabel(status: string) {
  return MONEY_REQUEST_STATUS_LABELS[status as MoneyRequestStatus] ?? status;
}

export function remittanceKindLabel(kind: string) {
  return REMITTANCE_KIND_LABELS[kind as RemittanceKind] ?? kind;
}
