import { describe, expect, it } from "vitest";
import {
  brandToCssVars,
  darkenHex,
  hexToRgbChannels,
  lightenHex,
  normalizeHex,
} from "@/lib/company-brand";

describe("company-brand", () => {
  it("normalizes hex colors", () => {
    expect(normalizeHex("#FCE74F")).toBe("#fce74f");
    expect(normalizeHex("bad")).toBeNull();
    expect(normalizeHex(null)).toBeNull();
  });

  it("converts hex to RGB channels", () => {
    expect(hexToRgbChannels("#fce74f")).toBe("252 231 79");
    expect(hexToRgbChannels("#292929")).toBe("41 41 41");
  });

  it("darkens and lightens", () => {
    expect(darkenHex("#fce74f", 0)).toBe("#fce74f");
    expect(lightenHex("#000000", 1)).toBe("#ffffff");
  });

  it("maps brand to CSS vars with defaults", () => {
    const vars = brandToCssVars({
      name: "Acme",
      logoUrl: null,
      brandAccentHex: null,
      brandInkHex: null,
    });
    expect(vars["--lagoon"]).toBe("252 231 79");
    expect(vars["--ink"]).toBe("41 41 41");
  });

  it("applies custom accent and ink", () => {
    const vars = brandToCssVars({
      name: "Acme",
      logoUrl: null,
      brandAccentHex: "#c45c26",
      brandInkHex: "#1a1a2e",
    });
    expect(vars["--lagoon"]).toBe("196 92 38");
    expect(vars["--ink"]).toBe("26 26 46");
  });
});
