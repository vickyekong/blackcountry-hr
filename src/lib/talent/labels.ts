export const APPLICATION_STATUSES = [
  "NEW",
  "REVIEWING",
  "INTERVIEW",
  "ASSESSMENT",
  "SHORTLISTED",
  "OFFER",
  "REJECTED",
  "HIRED",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  NEW: "Applied",
  REVIEWING: "Screening",
  INTERVIEW: "Interview",
  ASSESSMENT: "Assessment",
  SHORTLISTED: "Shortlisted",
  OFFER: "Offer",
  REJECTED: "Rejected",
  HIRED: "Hired",
};

export const PIPELINE_COLUMNS: Array<{
  id: ApplicationStatus;
  label: string;
}> = [
  { id: "NEW", label: "Applied" },
  { id: "REVIEWING", label: "Screening" },
  { id: "INTERVIEW", label: "Interview" },
  { id: "ASSESSMENT", label: "Assessment" },
  { id: "SHORTLISTED", label: "Shortlisted" },
  { id: "OFFER", label: "Offer" },
  { id: "HIRED", label: "Hired" },
];

export function applicationStatusLabel(status: string): string {
  return APPLICATION_STATUS_LABELS[status as ApplicationStatus] ?? status;
}

export const TRAINING_STATUSES = [
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "WAIVED",
] as const;
export type TrainingStatus = (typeof TRAINING_STATUSES)[number];

export const TRAINING_STATUS_LABELS: Record<TrainingStatus, string> = {
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  WAIVED: "Waived",
};

export const REVIEW_STATUSES = ["DRAFT", "SUBMITTED", "COMPLETED"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];
