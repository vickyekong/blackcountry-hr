import type { CopilotIntent } from "@/lib/copilot/intents";

export type CopilotRow = {
  label: string;
  detail: string;
};

export type CopilotAnswer = {
  intent: CopilotIntent;
  title: string;
  body: string;
  href?: string;
  rows: CopilotRow[];
};
