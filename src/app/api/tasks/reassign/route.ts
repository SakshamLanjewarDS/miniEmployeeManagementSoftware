import { NextRequest, NextResponse } from "next/server";
import { getCurrentTenantContext } from "@/server/auth/session";
import { reassignTask } from "@/server/modules/tasks/repository";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceSlug = searchParams.get("workspaceSlug") || "100percentdesign";

    const ctx = await getCurrentTenantContext(workspaceSlug);
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    const body = await req.json();
    const { taskId, newAssigneeId, reason } = body;

    if (!taskId || !newAssigneeId) {
      return NextResponse.json(
        { error: "Task ID and new assignee are required for reassignment." },
        { status: 400 }
      );
    }

    const updated = await reassignTask(ctx, taskId, newAssigneeId, reason);

    return NextResponse.json({ success: true, task: updated });
  } catch (err: any) {
    console.error("Task reassignment error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to reassign task" },
      { status: err.name === "ForbiddenException" ? 403 : 400 }
    );
  }
}
