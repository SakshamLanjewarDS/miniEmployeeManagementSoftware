import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { checkTaskAssigneeAvailability } from "@/server/modules/tasks/planning";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const workspaceSlug = body.workspaceSlug || req.headers.get("x-workspace-slug");

    if (!workspaceSlug) {
      return NextResponse.json({ error: "Missing workspaceSlug" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const { assigneeMembershipIds, startDate, dueDate, taskId } = body;

    const result = await checkTaskAssigneeAvailability(ctx, {
      assigneeMembershipIds: assigneeMembershipIds || [],
      startDate,
      dueDate,
      taskId,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to check task availability" },
      { status: 500 }
    );
  }
}
