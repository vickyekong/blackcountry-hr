import { describe, expect, it } from "vitest";
import {
  can,
  canReviewChangeType,
  effectivePortalRole,
  homePathForRole,
  portalLabel,
} from "@/lib/permissions";

describe("five-portal roles", () => {
  it("maps Staff (EMPLOYEE) to the staff portal home", () => {
    expect(effectivePortalRole("EMPLOYEE")).toBe("EMPLOYEE");
    expect(homePathForRole("EMPLOYEE")).toBe("/staff");
    expect(portalLabel("EMPLOYEE")).toBe("Staff");
  });

  it("keeps Super Admin and HR on the command center", () => {
    expect(homePathForRole("SUPER_ADMIN")).toBe("/dashboard");
    expect(homePathForRole("HR_ADMIN")).toBe("/dashboard");
  });

  it("sends Finance to its own portal", () => {
    expect(effectivePortalRole("FINANCE")).toBe("FINANCE");
    expect(homePathForRole("FINANCE")).toBe("/finance");
    expect(portalLabel("FINANCE")).toBe("Finance");
    expect(can("FINANCE", "manageEmployees")).toBe(false);
    expect(can("FINANCE", "approvePayroll")).toBe(false);
    expect(can("FINANCE", "processPayrollFinance")).toBe(true);
  });

  it("gives Business head files and timesheets, not payroll approval", () => {
    expect(homePathForRole("BUSINESS_HEAD")).toBe("/dashboard");
    expect(portalLabel("BUSINESS_HEAD")).toBe("Business head");
    expect(can("BUSINESS_HEAD", "editWorkspaceFiles")).toBe(true);
    expect(can("BUSINESS_HEAD", "reviewTimesheets")).toBe(true);
    expect(can("BUSINESS_HEAD", "approvePayroll")).toBe(false);
    expect(can("BUSINESS_HEAD", "manageStatutoryRates")).toBe(false);
    expect(can("BUSINESS_HEAD", "manageCompanySettings")).toBe(false);
  });

  it("denies staff admin tools", () => {
    expect(can("EMPLOYEE", "manageEmployees")).toBe(false);
    expect(can("EMPLOYEE", "runPayroll")).toBe(false);
    expect(can("EMPLOYEE", "manageCompanySettings")).toBe(false);
    expect(can("EMPLOYEE", "accessStaffPortal")).toBe(true);
  });

  it("lets HR review general staff requests but not bank/tax", () => {
    expect(canReviewChangeType("HR_ADMIN", "GENERAL")).toBe(true);
    expect(canReviewChangeType("HR_ADMIN", "NEXT_OF_KIN")).toBe(true);
    expect(canReviewChangeType("HR_ADMIN", "BANK")).toBe(false);
    expect(canReviewChangeType("SUPER_ADMIN", "BANK")).toBe(true);
  });

  it("does not let HR reverse Super Admin payroll sign-off", () => {
    expect(can("HR_ADMIN", "approvePayroll")).toBe(false);
    expect(can("SUPER_ADMIN", "approvePayroll")).toBe(true);
  });

  it("keeps payslips off the business head seat", () => {
    expect(can("BUSINESS_HEAD", "viewPayslips")).toBe(false);
    expect(can("HR_ADMIN", "viewPayslips")).toBe(true);
  });
});
