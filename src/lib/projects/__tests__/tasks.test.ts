import { describe, expect, it } from "vitest";
import { DEFAULT_PROJECT_TASK, parseTaskNames } from "@/lib/projects/tasks";

describe("project tasks", () => {
  it("defaults to General when none are given", () => {
    expect(parseTaskNames(undefined)).toEqual([DEFAULT_PROJECT_TASK]);
    expect(parseTaskNames([])).toEqual([DEFAULT_PROJECT_TASK]);
    expect(parseTaskNames(["  "])).toEqual([DEFAULT_PROJECT_TASK]);
  });

  it("keeps unique trimmed names in order", () => {
    expect(parseTaskNames([" Design ", "Site", "design"])).toEqual([
      "Design",
      "Site",
    ]);
  });
});
