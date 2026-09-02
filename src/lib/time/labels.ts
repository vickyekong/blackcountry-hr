export const HOLIDAY_KINDS = ["PUBLIC", "COMPANY"] as const;
export type HolidayKind = (typeof HOLIDAY_KINDS)[number];

export const HOLIDAY_KIND_LABELS: Record<HolidayKind, string> = {
  PUBLIC: "Public holiday",
  COMPANY: "Company holiday",
};

export const OVERTIME_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type OvertimeStatus = (typeof OVERTIME_STATUSES)[number];

export const OVERTIME_STATUS_LABELS: Record<OvertimeStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const SHIFT_EXCEPTION_KINDS = ["OFF", "SHIFT"] as const;
export type ShiftExceptionKind = (typeof SHIFT_EXCEPTION_KINDS)[number];

export const SHIFT_EXCEPTION_KIND_LABELS: Record<ShiftExceptionKind, string> = {
  OFF: "Day off",
  SHIFT: "Cover another shift",
};

export function holidayKindLabel(kind: string): string {
  return HOLIDAY_KIND_LABELS[kind as HolidayKind] ?? kind;
}

export function overtimeStatusLabel(status: string): string {
  return OVERTIME_STATUS_LABELS[status as OvertimeStatus] ?? status;
}

export function shiftExceptionKindLabel(kind: string): string {
  return SHIFT_EXCEPTION_KIND_LABELS[kind as ShiftExceptionKind] ?? kind;
}
