import { describe, expect, it } from "vitest";
import { validateChangePayload } from "@/lib/lifecycle/change-requests";

describe("change request validation", () => {
  it("requires 10-digit NUBAN", () => {
    const bad = validateChangePayload("BANK", {
      bankName: "GTBank",
      bankAccountNumber: "12345",
    });
    expect(bad.ok).toBe(false);

    const good = validateChangePayload("BANK", {
      bankName: "GTBank",
      bankAccountNumber: "0123456789",
    });
    expect(good.ok).toBe(true);
    if (good.ok) {
      expect(good.normalized.bankAccountNumber).toBe("0123456789");
    }
  });

  it("requires next of kin fields", () => {
    const bad = validateChangePayload("NEXT_OF_KIN", {
      nextOfKinName: "Ada",
    });
    expect(bad.ok).toBe(false);
  });

  it("accepts a general company request", () => {
    const bad = validateChangePayload("GENERAL", { subject: "Hi" });
    expect(bad.ok).toBe(false);

    const good = validateChangePayload("GENERAL", {
      subject: "Employment letter",
      message: "Please issue a letter of employment for my visa.",
    });
    expect(good.ok).toBe(true);
  });
});
