export const SKILL_LEVELS = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "EXPERT",
] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  EXPERT: "Expert",
};

export const DOCUMENT_CATEGORIES = [
  "CONTRACT",
  "ID",
  "CERTIFICATE",
  "TAX",
  "HR",
  "OFFER",
  "POLICY",
  "OTHER",
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  CONTRACT: "Contract",
  ID: "ID",
  CERTIFICATE: "Certificate",
  TAX: "Tax document",
  HR: "HR document",
  OFFER: "Offer letter",
  POLICY: "Policy acknowledgement",
  OTHER: "Other",
};

export const ASSET_TYPES = [
  "LAPTOP",
  "PHONE",
  "TABLET",
  "VEHICLE",
  "ACCESS_CARD",
  "EQUIPMENT",
  "OTHER",
] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  LAPTOP: "Laptop",
  PHONE: "Phone",
  TABLET: "Tablet",
  VEHICLE: "Vehicle",
  ACCESS_CARD: "Access card",
  EQUIPMENT: "Equipment",
  OTHER: "Other",
};

export const ASSET_STATUSES = ["AVAILABLE", "ASSIGNED", "RETIRED"] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  AVAILABLE: "Available",
  ASSIGNED: "Assigned",
  RETIRED: "Retired",
};

export function skillLevelLabel(level: string): string {
  return SKILL_LEVEL_LABELS[level as SkillLevel] ?? level;
}

export function documentCategoryLabel(category: string): string {
  return DOCUMENT_CATEGORY_LABELS[category as DocumentCategory] ?? category;
}

export function assetTypeLabel(type: string): string {
  return ASSET_TYPE_LABELS[type as AssetType] ?? type;
}

export function assetStatusLabel(status: string): string {
  return ASSET_STATUS_LABELS[status as AssetStatus] ?? status;
}
