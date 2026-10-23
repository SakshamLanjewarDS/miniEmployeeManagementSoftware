import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { reopenCompletedTask } from "@/server/modules/tasks/completed-tasks";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const workspaceSlug = body.workspaceSlug || req.headers.get("x-workspace-slug");
    const taskId = body.taskId;
    const reason = body.reason;

    if (!workspaceSlug || !taskId) {
      return NextResponse.json({ error: "Missing workspaceSlug or taskId" }, { status: 400 });
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: "A reason for reopening completed work is mandatory" }, { status: 400 });
    }

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const reopened = await reopenCompletedTask(ctx, taskId, { reason });
    return NextResponse.json({ success: true, task: reopened });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to reopen completed task" },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}
