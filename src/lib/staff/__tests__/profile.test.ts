import { describe, expect, it } from "vitest";
import {
  annualRentLocked,
  isSensitiveFieldLocked,
  profileCompleteness,
} from "@/lib/staff/profile";

describe("staff profile completeness", () => {
  it("scores missing personal and bank fields", () => {
    const result = profileCompleteness({
      sex: "FEMALE",
      phone: "",
      addressLine: null,
      nextOfKinName: "Ada",
      nextOfKinPhone: "0801",
      bankName: "GTBank",
      bankAccountNumber: "0123456789",
      tin: "",
    });
    expect(result.filled).toBe(5);
    expect(result.total).toBe(8);
    expect(result.missing).toEqual(["Phone", "Home address", "TIN"]);
  });

  it("locks bank details once they are on file", () => {
    expect(
      isSensitiveFieldLocked({ bankName: "GTBank" }, "bankName")
    ).toBe(true);
    expect(isSensitiveFieldLocked({ bankName: "" }, "bankName")).toBe(false);
    expect(annualRentLocked(0n)).toBe(false);
    expect(annualRentLocked(50000000n)).toBe(true);
  });
});
