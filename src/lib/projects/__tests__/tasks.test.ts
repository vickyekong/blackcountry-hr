import { describe, expect, it } from "vitest";
import { DEFAULT_PROJECT_TASK, parseTaskNames } from "@/lib/projects/tasks";
import {
  WEEKLY_CAPACITY_MINUTES,
  remainingCapacityMinutes,
  workloadPercent,
} from "@/lib/projects/workload";
import { canManageTaskProgress } from "@/lib/projects/access";

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

describe("workload", () => {
  it("treats 40 hours as a full week", () => {
    expect(WEEKLY_CAPACITY_MINUTES).toBe(40 * 60);
    expect(workloadPercent(20 * 60)).toBe(50);
    expect(remainingCapacityMinutes(50 * 60)).toBe(0);
  });
});

describe("task progress access", () => {
  it("lets the assignee update progress without manage permission", () => {
    expect(
      canManageTaskProgress({
        role: "EMPLOYEE",
        employeeId: "e1",
        assigneeEmployeeId: "e1",
      })
    ).toBe(true);
    expect(
      canManageTaskProgress({
        role: "EMPLOYEE",
        employeeId: "e1",
        assigneeEmployeeId: "e2",
      })
    ).toBe(false);
    expect(
      canManageTaskProgress({
        role: "HR_ADMIN",
        employeeId: null,
        assigneeEmployeeId: "e2",
      })
    ).toBe(true);
  });
});
