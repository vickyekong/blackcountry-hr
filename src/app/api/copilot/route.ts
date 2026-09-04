import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, requirePermission } from "@/lib/api-auth";
import { suggestedPromptsForRole } from "@/lib/copilot/scope";
import { answerCopilotQuestion } from "@/lib/copilot/answer";

const askSchema = z.object({
  question: z.string().trim().min(3).max(500),
});

export async function GET() {
  try {
    const session = await requirePermission("askCopilot");
    return NextResponse.json({
      prompts: suggestedPromptsForRole(session.user.role),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("askCopilot");
    const body = askSchema.parse(await req.json());
    const answer = await answerCopilotQuestion({
      companyId: session.user.companyId,
      role: session.user.role,
      question: body.question,
    });
    return NextResponse.json({ question: body.question, answer });
  } catch (error) {
    return handleApiError(error);
  }
}
