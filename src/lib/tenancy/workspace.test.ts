import { describe, expect, it } from "vitest";
import { canSwitchAcrossGroup } from "@/lib/tenancy/group-access";

describe("workspace switcher", () => {
  it("lets group Super Admin, HR, and Finance open subsidiaries", () => {
    expect(canSwitchAcrossGroup("SUPER_ADMIN")).toBe(true);
    expect(canSwitchAcrossGroup("HR_ADMIN")).toBe(true);
    expect(canSwitchAcrossGroup("FINANCE")).toBe(true);
  });

  it("keeps business head and staff in their home company", () => {
    expect(canSwitchAcrossGroup("BUSINESS_HEAD")).toBe(false);
    expect(canSwitchAcrossGroup("EMPLOYEE")).toBe(false);
  });
});
