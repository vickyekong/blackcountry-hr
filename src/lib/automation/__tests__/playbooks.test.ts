import { describe, expect, it } from "vitest";
import {
  DEFAULT_AUTOMATION_SETTINGS,
  inboxKindsForRole,
  inLeadWindow,
  parseAutomationSettings,
  shouldSendPayrollReminder,
  WORKFLOW_PLAYBOOKS,
} from "@/lib/automation/playbooks";

describe("automation playbooks", () => {
  it("documents the existing approval engines", () => {
    const ids = WORKFLOW_PLAYBOOKS.map((p) => p.id);
    expect(ids).toContain("LEAVE");
    expect(ids).toContain("PAYROLL");
    expect(ids).toContain("EXPENSE");
  });

  it("lets Super Admin see payroll in the inbox but not HR", () => {
    expect(inboxKindsForRole("SUPER_ADMIN")).toContain("payroll");
    expect(inboxKindsForRole("HR_ADMIN")).not.toContain("payroll");
    expect(inboxKindsForRole("BUSINESS_HEAD")).toEqual(["expense"]);
    expect(inboxKindsForRole("EMPLOYEE")).toEqual([]);
  });

  it("parses reminder settings with clamps", () => {
    const parsed = parseAutomationSettings({
      expiryLeadDays: 400,
      payrollReminderDay: 0,
      alerts: { timesheets: false },
    });
    expect(parsed.expiryLeadDays).toBe(365);
    expect(parsed.payrollReminderDay).toBe(1);
    expect(parsed.alerts.timesheets).toBe(false);
    expect(parsed.alerts.expiry).toBe(DEFAULT_AUTOMATION_SETTINGS.alerts.expiry);
  });

  it("sends a payroll reminder after the reminder day when no run exists", () => {
    expect(
      shouldSendPayrollReminder({
        dayOfMonth: 25,
        reminderDay: 25,
        hasApprovedRunThisMonth: false,
      })
    ).toBe(true);
    expect(
      shouldSendPayrollReminder({
        dayOfMonth: 10,
        reminderDay: 25,
        hasApprovedRunThisMonth: false,
      })
    ).toBe(false);
    expect(
      shouldSendPayrollReminder({
        dayOfMonth: 28,
        reminderDay: 25,
        hasApprovedRunThisMonth: true,
      })
    ).toBe(false);
  });

  it("treats a date inside the lead window as due", () => {
    const now = new Date(2026, 8, 4);
    expect(inLeadWindow(new Date(2026, 8, 20), 60, now)).toBe(true);
    expect(inLeadWindow(new Date(2027, 2, 1), 60, now)).toBe(false);
  });
});
