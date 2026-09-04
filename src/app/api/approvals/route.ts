import { NextResponse } from "next/server";
import { handleApiError, requirePermission } from "@/lib/api-auth";
import { loadApprovalInbox } from "@/lib/automation/inbox";
import { WORKFLOW_PLAYBOOKS } from "@/lib/automation/playbooks";

export async function GET() {
  try {
    const session = await requirePermission("viewApprovals");
    const items = await loadApprovalInbox({
      companyId: session.user.companyId,
      role: session.user.role,
      employeeId: session.user.employeeId,
    });
    return NextResponse.json({
      items,
      playbooks: WORKFLOW_PLAYBOOKS,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
