import { describe, expect, it } from "vitest";
import {
  accessibleCompaniesForSeat,
  ancestorCompanyIds,
  flattenCompanyTree,
} from "@/lib/tenancy/company-tree";

const GROUP = { id: "g", name: "Blackcountry Group", parentId: null };
const FARMS = { id: "f", name: "Blackcountry Farms", parentId: "g" };
const ENG = { id: "e", name: "Blackcountry Engineering", parentId: "g" };
const DESIGN = { id: "d", name: "Blackcountry Design", parentId: "e" };
const BUILD = { id: "c", name: "Blackcountry Construction", parentId: "e" };
const INTERIORS = { id: "i", name: "Blackcountry Interiors", parentId: "e" };
const MACHINERY = { id: "m", name: "Blackcountry Machinery", parentId: "e" };
const AUTOMATION = { id: "a", name: "Blackcountry Automation", parentId: "e" };
const ALL = [GROUP, FARMS, ENG, DESIGN, BUILD, INTERIORS, MACHINERY, AUTOMATION];

describe("company tree", () => {
  it("nests Engineering sub-companies under Engineering", () => {
    const tree = flattenCompanyTree("g", ALL, "g");
    expect(tree.map((c) => c.name)).toEqual([
      "Blackcountry Group",
      "Blackcountry Engineering",
      "Blackcountry Automation",
      "Blackcountry Construction",
      "Blackcountry Design",
      "Blackcountry Interiors",
      "Blackcountry Machinery",
      "Blackcountry Farms",
    ]);
    expect(tree.find((c) => c.id === "d")?.depth).toBe(2);
    expect(tree.find((c) => c.id === "e")?.depth).toBe(1);
  });

  it("lets group Super Admin see Farms, Engineering, and Engineering children", () => {
    const list = accessibleCompaniesForSeat(GROUP, ALL, "SUPER_ADMIN");
    expect(list.map((c) => c.id).sort()).toEqual([
      "a",
      "c",
      "d",
      "e",
      "f",
      "g",
      "i",
      "m",
    ]);
  });

  it("lets an Engineering business head open Engineering children but not Farms", () => {
    const list = accessibleCompaniesForSeat(ENG, ALL, "BUSINESS_HEAD");
    expect(list.map((c) => c.id).sort()).toEqual(["a", "c", "d", "e", "i", "m"]);
  });

  it("keeps staff in their home company", () => {
    const list = accessibleCompaniesForSeat(FARMS, ALL, "EMPLOYEE");
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("f");
  });

  it("walks Design payroll approval up through Engineering to the group", () => {
    expect(ancestorCompanyIds("d", ALL)).toEqual(["d", "e", "g"]);
  });
});
