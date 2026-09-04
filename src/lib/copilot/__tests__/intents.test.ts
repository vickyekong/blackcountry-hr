import { describe, expect, it } from "vitest";
import { parseCopilotQuestion } from "@/lib/copilot/intents";
import { canAskIntent, suggestedPromptsForRole } from "@/lib/copilot/scope";

describe("Omni Co-Pilot intents", () => {
  const cases: Array<[string, string]> = [
    ["Who has been late more than five times this month?", "late_repeat"],
    ["Which department has the highest payroll cost?", "dept_payroll_cost"],
    ["Why did payroll increase this month?", "payroll_why_up"],
    ["Which employee contracts expire within 60 days?", "contract_expiry"],
    ["Which employees have outstanding loans?", "outstanding_loans"],
    ["Who has not submitted their timesheet?", "missing_timesheets"],
    ["What is our current employee turnover rate?", "turnover"],
    [
      "What would happen to payroll if salaries increased by 10%?",
      "salary_simulate",
    ],
    ["Which departments have the highest overtime?", "dept_overtime"],
    ["Which employees have declining performance?", "declining_performance"],
    ["What should I watch this week?", "briefing"],
  ];

  it.each(cases)("classifies %s", (question, intent) => {
    expect(parseCopilotQuestion(question).intent).toBe(intent);
  });

  it("reads the 10% lift and a custom late threshold", () => {
    const sim = parseCopilotQuestion(
      "What would happen to payroll if salaries increased by 10%?"
    );
    expect(sim.salaryIncreaseBps).toBe(1000);
    const late = parseCopilotQuestion(
      "Who has been late more than three times this month?"
    );
    expect(late.lateMin).toBe(3);
    expect(
      parseCopilotQuestion("Which employee contracts expire within 30 days?")
        .expiryDays
    ).toBe(30);
  });

  it("does not leak payroll simulate or loans to a business head", () => {
    expect(canAskIntent("BUSINESS_HEAD", "salary_simulate")).toBe(false);
    expect(canAskIntent("BUSINESS_HEAD", "outstanding_loans")).toBe(false);
    expect(canAskIntent("BUSINESS_HEAD", "turnover")).toBe(true);
    expect(canAskIntent("HR_ADMIN", "salary_simulate")).toBe(true);
    expect(canAskIntent("SUPER_ADMIN", "outstanding_loans")).toBe(true);
    expect(canAskIntent("EMPLOYEE", "turnover")).toBe(false);
    expect(
      suggestedPromptsForRole("BUSINESS_HEAD").some((p) =>
        p.toLowerCase().includes("loan")
      )
    ).toBe(false);
  });
});
