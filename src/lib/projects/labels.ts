export const PROJECT_STATUSES = [
  "PLANNING",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "ARCHIVED",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNING: "Planning",
  ACTIVE: "Active",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

export const TASK_PROGRESS = ["TODO", "IN_PROGRESS", "DONE"] as const;
export type TaskProgress = (typeof TASK_PROGRESS)[number];

export const TASK_PROGRESS_LABELS: Record<TaskProgress, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export function projectStatusLabel(status: string) {
  return PROJECT_STATUS_LABELS[status as ProjectStatus] ?? status;
}

export function taskProgressLabel(progress: string) {
  return TASK_PROGRESS_LABELS[progress as TaskProgress] ?? progress;
}

export function taskPriorityLabel(priority: string) {
  return TASK_PRIORITY_LABELS[priority as TaskPriority] ?? priority;
}

/** Timesheets still log only against ACTIVE projects and ACTIVE catalog tasks. */
export function isTimesheetProject(status: string) {
  return status === "ACTIVE";
}
