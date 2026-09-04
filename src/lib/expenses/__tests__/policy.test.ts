import { describe, expect, it } from "vitest";
import { nairaToKobo } from "@/lib/money";
import {
  canApproveExpense,
  isManagerBand,
  requiresExecutiveApproval,
} from "@/lib/expenses/policy";

describe("expense approval bands", () => {
  it("lets a line manager approve up to ₦100,000", () => {
    expect(isManagerBand(nairaToKobo(100_000))).toBe(true);
    expect(
      canApproveExpense({
        role: "BUSINESS_HEAD",
        amountKobo: nairaToKobo(80_000),
        isLineManager: true,
      })
    ).toBe(true);
    expect(
      canApproveExpense({
        role: "BUSINESS_HEAD",
        amountKobo: nairaToKobo(100_001),
        isLineManager: true,
      })
    ).toBe(false);
  });

  it("lets HR approve up to ₦500,000 but not above", () => {
    expect(
      canApproveExpense({
        role: "HR_ADMIN",
        amountKobo: nairaToKobo(500_000),
      })
    ).toBe(true);
    expect(requiresExecutiveApproval(nairaToKobo(500_001))).toBe(true);
    expect(
      canApproveExpense({
        role: "HR_ADMIN",
        amountKobo: nairaToKobo(500_001),
      })
    ).toBe(false);
  });

  it("lets Super Admin approve any amount", () => {
    expect(
      canApproveExpense({
        role: "SUPER_ADMIN",
        amountKobo: nairaToKobo(2_000_000),
      })
    ).toBe(true);
  });

  it("does not let Finance approve claims", () => {
    expect(
      canApproveExpense({
        role: "FINANCE",
        amountKobo: nairaToKobo(10_000),
      })
    ).toBe(false);
  });
});
